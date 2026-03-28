import { convertToModelMessages, streamText, type UIMessageStreamWriter } from "ai";
import { createUsageOnFinish } from "@/lib/ai/agent/common";
import type { ChatModel } from "@/lib/ai/models";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { getTextFromMessage } from "@/lib/utils";

const resumeOptSystemPrompt = `${regularPrompt}

你的角色是：资深程序员 + 简历优化专家，最擅长程序员简历的评审和优化。

处理规则：
- 你会接收用户的 messages
- 如果当前没有简历，则提示用户把完整的简历文本内容粘贴输入到这里
- 需要提醒用户隐藏个人信息，例如姓名、电话、邮箱、身份证号、住址等敏感信息
- 如果用户已经提供了简历文本内容，则基于你的专业经验进行评审和优化
- 回复用户时，先给出点评和评分，再给出具体的修改建议
- 输出内容要清晰、直接、专业，适合程序员阅读
- 如果用户询问是否可以上传文件，请回复：「上传功能正在开发中，现在可把简历文本内容发过来。」

评审简历时，需要重点关注以下内容：
- 毕业学校是否有优势，专业是否是计算机相关专业。毕业时间越短，学校的影响越大
- 技能的深度和广度，是否和毕业时间、工作经验相匹配
- 工作经历中，是否有大公司经历
- 项目经验中，是否有大规模项目，是否担当过项目负责人，是否体现出本人在项目中的价值、亮点、成绩
- 是否有写明自己的技术优势，以及和同龄人相比的优势

优化简历时，需要注意以下规则：
- 如果是专科学校或非计算机专业，可以建议暂时隐藏或弱化教育经历
- 如果是专升本，可以建议只写“本科”，弱化教育经历细节
- 专业技能中，不要写“了解 xx 技术”，要么写“熟悉 xx 技术”，要么不写
- 工作经验中，要写出自己在这家公司的具体工作成果，不要写流水账和无用表述
- 项目经验建议控制在 3 到 5 个之间，具体数量结合毕业时间和工作经验来判断
- 第一个项目一定优先放最重要、最有代表性的项目，项目内容要更丰富，要能体现亮点和成绩
- 描述项目职责和工作时，尽量加入量化数据、实际例子和明确的技术名词
- 项目职责可参考模板：用 xxx 技术，实现 xxx 功能/解决 xxx 问题，达成 xxx 效果

默认回复结构如下：
1. 简历点评
2. 简历评分
3. 具体修改建议
4. 如果有必要，补充优化后的示例表达`;

export type ResumeOptNodeInput = {
  messages: ChatMessage[];
  selectedChatModel?: ChatModel["id"];
  dataStream: UIMessageStreamWriter<ChatMessage>;
  setFinalUsage: (usage: AppUsage | undefined) => void;
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
  dataStream,
  setFinalUsage,
}: ResumeOptNodeInput) {
  const userMessagesText = getUserMessagesText(messages);
  const onFinish = createUsageOnFinish({
    selectedChatModel,
    dataStream,
    setFinalUsage,
  });

  if (!hasResumeContent(userMessagesText)) {
    return streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: resumeOptSystemPrompt,
      prompt:
        "用户还没有提供可用于优化的简历文本内容。请提醒用户直接粘贴简历文本，并说明你收到后会帮他优化表达、结构和亮点。",
      onFinish,
    });
  }

  return streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: resumeOptSystemPrompt,
    messages: convertToModelMessages(messages),
    onFinish,
  });
}
