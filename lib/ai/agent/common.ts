import type { LanguageModelUsage, UIMessageStreamWriter } from "ai";
import { unstable_cache as cache } from "next/cache";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { ChatModel } from "@/lib/ai/models";
import { classifyNode } from "@/lib/ai/agent/classify";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { getMostRecentUserMessage } from "@/lib/utils";

export type AgentRouterInput = {
  messages: ChatMessage[];
  selectedChatModel: ChatModel["id"];
  dataStream: UIMessageStreamWriter<ChatMessage>;
  setFinalUsage: (usage: AppUsage | undefined) => void;
};

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return;
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }
);

export function createUsageOnFinish({
  selectedChatModel,
  dataStream,
  setFinalUsage,
}: {
  selectedChatModel: ChatModel["id"];
  dataStream: UIMessageStreamWriter<ChatMessage>;
  setFinalUsage: (usage: AppUsage | undefined) => void;
}) {
  return async ({ usage }: { usage: LanguageModelUsage }) => {
    try {
      const providers = await getTokenlensCatalog();
      const modelId = myProvider.languageModel(selectedChatModel).modelId;

      if (!modelId || !providers) {
        setFinalUsage(usage);
        dataStream.write({
          type: "data-usage",
          data: usage,
        });
        return;
      }

      const summary = getUsage({ modelId, usage, providers });
      const finalUsage = { ...usage, ...summary, modelId } as AppUsage;

      setFinalUsage(finalUsage);
      dataStream.write({
        type: "data-usage",
        data: finalUsage,
      });
    } catch (err) {
      console.warn("TokenLens enrichment failed", err);
      setFinalUsage(usage);
      dataStream.write({
        type: "data-usage",
        data: usage,
      });
    }
  };
}

export async function createSpecializedAgentStream({
  messages,
  selectedChatModel,
  dataStream,
  setFinalUsage,
}: AgentRouterInput) {
  const latestUserMessage = getMostRecentUserMessage(messages);

  try {
    const classification = await Promise.race([
      classifyNode({
        messages: latestUserMessage ? [latestUserMessage as ChatMessage] : messages,
      }),
      new Promise<{ category: "others"; raw: null }>((resolve) =>
        setTimeout(() => resolve({ category: "others", raw: null }), 3000)
      ),
    ]);

    const { category, raw } = classification;

    console.log("[agent] classification:", {
      category,
      raw,
      selectedChatModel,
    });

    if (category === "resume_opt") {
      const { createResumeOptStream } = await import("@/lib/ai/agent/resume-opt");

      return {
        category,
        result: createResumeOptStream({
          messages,
          selectedChatModel,
          dataStream,
          setFinalUsage,
        }),
      };
    }

    if (category === "mock_interview") {
      const { createMockInterviewStream } = await import(
        "@/lib/ai/agent/mock-interview"
      );

      return {
        category,
        result: createMockInterviewStream({
          messages,
          selectedChatModel,
          dataStream,
          setFinalUsage,
        }),
      };
    }

    return {
      category,
      result: null,
    };
  } catch (error) {
    console.warn("Agent classify failed, fallback to default chat", error);

    return {
      category: "others" as const,
      result: null,
    };
  }
}
