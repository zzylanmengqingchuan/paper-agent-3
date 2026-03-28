import { convertToModelMessages, streamText } from "ai";
import type { ChatModel } from "@/lib/ai/models";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";

const mockInterviewSystemPrompt = `${regularPrompt}

你当前是一个专门负责“模拟程序员面试”的 AI 面试官。

处理规则：
- 你会接收用户的 messages
- 你的目标是和用户进行一轮简洁的程序员模拟面试
- 暂时不需要严格设计面试流程，也不需要复杂状态管理
- 如果用户还没有提供岗位方向或技术栈，你可以先让用户简单说明目标岗位、年限和技术栈
- 如果用户已经开始回答，就继续基于上下文追问或点评
- 输出风格要像真实面试官，专业、直接、清晰
- 每次回复尽量聚焦当前一轮提问或简短反馈，避免一次性输出过多内容`;

export type MockInterviewNodeInput = {
  messages: ChatMessage[];
  selectedChatModel?: ChatModel["id"];
};

export function createMockInterviewStream({
  messages,
  selectedChatModel = "chat-model",
}: MockInterviewNodeInput) {
  return streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: mockInterviewSystemPrompt,
    messages: convertToModelMessages(messages),
  });
}
