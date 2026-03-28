import type { ChatModel } from "@/lib/ai/models";
import { classifyNode } from "@/lib/ai/agent/classify";
import { createMockInterviewStream } from "@/lib/ai/agent/mock-interview";
import { createResumeOptStream } from "@/lib/ai/agent/resume-opt";
import type { ChatMessage } from "@/lib/types";
import { getMostRecentUserMessage } from "@/lib/utils";

export type AgentRouterInput = {
  messages: ChatMessage[];
  selectedChatModel: ChatModel["id"];
};

export async function createSpecializedAgentStream({
  messages,
  selectedChatModel,
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
      return {
        category,
        result: createResumeOptStream({
          messages,
          selectedChatModel,
        }),
      };
    }

    if (category === "mock_interview") {
      return {
        category,
        result: createMockInterviewStream({
          messages,
          selectedChatModel,
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
