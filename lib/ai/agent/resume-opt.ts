import { convertToModelMessages, streamText } from "ai";
import type { ChatModel } from "@/lib/ai/models";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";

const resumeOptSystemPrompt = `${regularPrompt}

你当前是一个专门负责“简历优化”的 AI 助手。

处理规则：
- 你会接收用户的 messages
- 如果用户还没有提供简历文本内容，明确提示用户直接粘贴简历文本
- 如果用户已经提供了简历文本内容，不需要做复杂分析，直接基于专业经验进行简历优化
- 优化时优先输出：优化后的简历内容 + 简短修改建议
- 保持输出清晰、直接、易复制
- 如果用户询问是否可以上传文件，请回复：「上传功能正在开发中，现在可把简历文本内容发过来。」`;

export type ResumeOptNodeInput = {
  messages: ChatMessage[];
  selectedChatModel?: ChatModel["id"];
};

function getUserMessagesText(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => getTextFromMessage(message).trim())
    .filter(Boolean)
    .join("\n\n");
}

function hasResumeContent(text: string) {
  const normalizedText = text.trim();

  if (normalizedText.length >= 120) {
    return true;
  }

  return /(教育经历|工作经历|项目经历|专业技能|自我评价|实习经历|姓名|电话|邮箱)/.test(
    normalizedText
  );
}

export function createResumeOptStream({
  messages,
  selectedChatModel = "chat-model",
}: ResumeOptNodeInput) {
  const userMessagesText = getUserMessagesText(messages);

  if (!hasResumeContent(userMessagesText)) {
    return streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: resumeOptSystemPrompt,
      prompt:
        "用户还没有提供可用于优化的简历文本内容。请提醒用户直接粘贴简历文本，并说明你收到后会帮他优化表达、结构和亮点。",
    });
  }

  return streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: resumeOptSystemPrompt,
    messages: convertToModelMessages(messages),
  });
}
