export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "DeepSeek Chat",
    description: "通用对话模型，适合日常问答和编程任务",
  },
  {
    id: "chat-model-reasoning",
    name: "DeepSeek Reasoner",
    description: "深度推理模型，适合复杂问题和逻辑分析",
  },
];
