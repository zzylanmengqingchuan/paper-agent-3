import { convertToModelMessages, generateObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";

export const classifySystemPrompt = `你是一个互联网大公司的资深程序员和面试官，尤其擅长前端技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、小程序等技术。
请根据用户输入的内容，判断用户属于哪一种情况？按说明输出 JSON 格式。`;

export const classifyCategorySchema = z.enum([
  "resume_opt",
  "mock_interview",
  "related_topics",
  "others",
]);

export const classifyResultSchema = z.object({
  category: classifyCategorySchema.describe(
    "用户当前诉求的分类：resume_opt 表示简历优化，mock_interview 表示模拟面试，related_topics 表示和编程、面试、简历相关的话题，others 表示其他话题。"
  ),
});

export type ClassifyCategory = z.infer<typeof classifyCategorySchema>;
export type ClassifyResult = z.infer<typeof classifyResultSchema>;

export type ClassifyNodeInput = {
  messages: ChatMessage[];
};

export async function classifyNode({
  messages,
}: ClassifyNodeInput): Promise<ClassifyResult> {
  const { object } = await generateObject({
    model: myProvider.languageModel("chat-model"),
    system: classifySystemPrompt,
    messages: convertToModelMessages(messages),
    schema: classifyResultSchema,
    temperature: 0,
  });

  return object;
}
