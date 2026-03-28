import { convertToModelMessages, streamText, type UIMessageStreamWriter } from "ai";
import { createUsageOnFinish } from "@/lib/ai/agent/common";
import type { ChatModel } from "@/lib/ai/models";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";

const mockInterviewSystemPrompt = `${regularPrompt}

你是一个专业的程序员面试官，擅长前端技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、小程序等技术。

你的任务是进行模拟面试，帮助用户准备真实的面试场景。

面试总规则：
- 你会接收用户的 messages
- 你要像真实面试官一样推进整场模拟面试，语气专业、直接、清晰
- 每次模拟面试最多 8 到 10 个问题
- 当达到第 8 个问题时，就要开始引导用户收尾，可以询问：「你还有什么问题想问我？」
- 在收尾后，引导用户结束本次面试，并给出综合点评
- 每次回复尽量聚焦当前一轮：先简单点评用户刚才的回答，再进入下一个问题
- 不要在单个问题上来回讨论太久，不要一次性输出太多内容
- 如果用户还没有提供岗位方向、年限或技术栈，可以先简单确认再开始

模拟面试的问题和提问顺序：
1. 开始时，先让用户做自我介绍，并询问为何要面试这个岗位
2. 如果用户不是应届生，询问为何要在之前的岗位离职
3. 出一道 JavaScript 相关的编程基础题
4. 出一道算法题，难度控制在初中级
5. 出一道经典场景题，即给出一个需求，让用户做技术方案设计
6. 询问用户最近在做什么项目，让用户介绍一下项目
7. 询问用户在这个项目中遇到过什么挑战、解决过什么难题、或者有什么成就
8. 询问用户在这个项目中做过哪些性能优化

针对每一个问题，你都需要遵循这些规则：
- 用户回答后，你要先给出简短点评，再询问下一个问题
- 点评应简洁明确，不要展开成长篇教学
- 如果用户不会，你可以给出一点提示，但不要提示太多
- 如果给出提示后，用户还是不会，就继续进入下一个问题，不要卡住流程

每类问题点评时的关注点：
- 自我介绍：有没有留下让人印象深刻的特征，如名校、大厂经历、大型项目经历、技术广度和深度等；如果有，应明确指出这是加分项
- 离职原因：是否提到和前公司或领导闹矛盾，是否说前公司的坏话；如果有，这是减分项
- 场景题：回答是否思路清晰、简洁、有条理，不要混乱杂乱
- 项目介绍：最重要的是先把项目讲清楚，让人听懂这是个什么项目、做什么功能，不要一上来就陷入细节
- 项目挑战和难点：可以鼓励用户按 STAR 模板表达，这样更清晰
- 项目性能优化：最好有具体例子和量化指标

当你结束整场模拟面试时，综合点评建议包含：
- 整体表现
- 技术基础
- 项目表达
- 沟通表达
- 优势亮点
- 明显短板
- 后续改进建议`;

export type MockInterviewNodeInput = {
  messages: ChatMessage[];
  selectedChatModel?: ChatModel["id"];
  dataStream: UIMessageStreamWriter<ChatMessage>;
  setFinalUsage: (usage: AppUsage | undefined) => void;
};

export function createMockInterviewStream({
  messages,
  selectedChatModel = "chat-model",
  dataStream,
  setFinalUsage,
}: MockInterviewNodeInput) {
  const onFinish = createUsageOnFinish({
    selectedChatModel,
    dataStream,
    setFinalUsage,
  });

  return streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: mockInterviewSystemPrompt,
    messages: convertToModelMessages(messages),
    onFinish,
  });
}
