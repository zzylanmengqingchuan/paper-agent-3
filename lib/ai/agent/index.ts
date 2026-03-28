import {
  convertToModelMessages,
  createUIMessageStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { Session } from "next-auth";
import type { ChatModel } from "@/lib/ai/models";
import { classifyNode } from "@/lib/ai/agent/classify";
import { createMockInterviewStream } from "@/lib/ai/agent/mock-interview";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createResumeOptStream } from "@/lib/ai/agent/resume-opt";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { generateUUID } from "@/lib/utils";
export * from "./classify";
export * from "./mock-interview";
export * from "./resume-opt";

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export type ChatStreamOptions = {
  selectedChatModel: ChatModel["id"];
  requestHints: RequestHints;
  uiMessages: ChatMessage[];
  session: Session;
  onFinish: (messages: ChatMessage[]) => Promise<void>;
};

export type ChatStreamResult = {
  stream: ReturnType<typeof createUIMessageStream>;
  getFinalUsage: () => AppUsage | undefined;
};

export function createChatStream(options: ChatStreamOptions): ChatStreamResult {
  const {
    selectedChatModel,
    requestHints,
    uiMessages,
    session,
    onFinish,
  } = options;

  let finalMergedUsage: AppUsage | undefined;

  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }) => {
      const { category } = await classifyNode({
        messages: uiMessages,
      });

      let result;

      if (category === "resume_opt") {
        result = createResumeOptStream({
          messages: uiMessages,
          selectedChatModel,
        });
      } else if (category === "mock_interview") {
        result = createMockInterviewStream({
          messages: uiMessages,
          selectedChatModel,
        });
      } else {
        result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });
      }

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        })
      );
    },
    generateId: generateUUID,
    onFinish: async ({ messages }) => {
      await onFinish(messages as ChatMessage[]);
    },
    onError: () => {
      return "Oops, an error occurred!";
    },
  });

  return {
    stream,
    getFinalUsage: () => finalMergedUsage,
  };
}

export type { AppUsage };
