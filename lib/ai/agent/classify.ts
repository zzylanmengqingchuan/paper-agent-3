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
  category: classifyCategorySchema
    .optional()
    .describe(
      "用户当前诉求的分类：resume_opt 表示简历优化，mock_interview 表示模拟面试，related_topics 表示和编程、面试、简历相关的话题，others 表示其他话题。"
    ),
  type: z.string().optional().describe("分类类型的兼容字段。"),
  details: z.string().optional().describe("分类说明，可选。"),
  resume_opt: z.boolean().optional(),
  mock_interview: z.boolean().optional(),
  related_topics: z.boolean().optional(),
  others: z.boolean().optional(),
});

export type ClassifyCategory = z.infer<typeof classifyCategorySchema>;
export type ClassifyResult = {
  category: ClassifyCategory;
  raw: z.infer<typeof classifyResultSchema>;
};

export type ClassifyNodeInput = {
  messages: ChatMessage[];
};

function normalizeCategory(
  result: z.infer<typeof classifyResultSchema>
): ClassifyCategory {
  if (result.category) {
    return result.category;
  }

  if (result.resume_opt) {
    return "resume_opt";
  }

  if (result.mock_interview) {
    return "mock_interview";
  }

  if (result.related_topics) {
    return "related_topics";
  }

  if (result.others) {
    return "others";
  }

  const normalizedType = result.type?.toLowerCase().trim();

  if (
    normalizedType === "resume_opt" ||
    normalizedType === "resume_optimization" ||
    normalizedType === "resume" ||
    normalizedType === "cv_optimization"
  ) {
    return "resume_opt";
  }

  if (
    normalizedType === "mock_interview" ||
    normalizedType === "interview_simulation" ||
    normalizedType === "mock_interview_simulation"
  ) {
    return "mock_interview";
  }

  if (normalizedType === "related_topics") {
    return "related_topics";
  }

  return "others";
}

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

  const category = normalizeCategory(object);

  console.log("[agent] raw classification:", object);

  return {
    category,
    raw: object,
  };
}
