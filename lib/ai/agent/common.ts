import type { ChatModel } from "@/lib/ai/models";
import { classifyNode } from "@/lib/ai/agent/classify";
import { createMockInterviewStream } from "@/lib/ai/agent/mock-interview";
import { createResumeOptStream } from "@/lib/ai/agent/resume-opt";
import type { ChatMessage } from "@/lib/types";

export type AgentRouterInput = {
  messages: ChatMessage[];
  selectedChatModel: ChatModel["id"];
};

export async function createSpecializedAgentStream({
  messages,
  selectedChatModel,
}: AgentRouterInput) {
  const { category } = await classifyNode({
    messages,
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
}
