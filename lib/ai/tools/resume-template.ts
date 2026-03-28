import { tool } from "ai";
import { z } from "zod";

export async function getResumeTemplate(): Promise<string> {
  return `# 程序员简历模板

## 个人优势
- 3-5 年前端开发经验，熟悉 Web 应用开发流程
- 熟悉 HTML、CSS、JavaScript、TypeScript、React、Vue
- 具备良好的业务理解能力、技术方案设计能力和团队协作能力

## 专业技能
- 熟悉 HTML5、CSS3、JavaScript、TypeScript，具备扎实的前端基础
- 熟悉 React / Vue 生态，能够独立完成中后台或业务项目开发
- 熟悉 Node.js 常见开发方式，了解前后端协作流程
- 熟悉浏览器渲染原理、性能优化、工程化构建等前端实践

## 工作经历
### 公司名称 / 前端开发工程师 / 2022.01 - 至今
- 负责 xxx 业务系统的前端开发与维护，支撑日常业务需求迭代
- 使用 xxx 技术，实现 xxx 功能，解决 xxx 问题，达成 xxx 效果
- 主导或参与 xxx 模块重构，提升页面性能和开发效率
- 与产品、设计、后端协作，推动项目按时高质量交付

## 项目经验
### 项目一：核心项目名称
- 项目背景：该项目主要用于 xxx，服务 xxx 用户，核心目标是 xxx
- 技术栈：React、TypeScript、Node.js、xxx
- 项目职责：
  - 使用 xxx 技术，实现 xxx 功能，解决 xxx 问题，达成 xxx 效果
  - 负责 xxx 模块设计与开发，提升 xxx 指标
  - 推动 xxx 优化，页面打开时间从 xx 降低到 xx
- 项目亮点：
  - 通过 xxx 方案，将转化率提升 xx%
  - 通过 xxx 优化，将接口耗时降低 xx%

### 项目二：代表项目名称
- 项目背景：用于 xxx
- 技术栈：Vue、JavaScript、xxx
- 项目职责：
  - 负责 xxx
  - 优化 xxx
  - 支撑 xxx

## 教育经历
### 学校名称 / 计算机相关专业 / 本科 / 2018 - 2022

## 自我评价
- 具备较强的学习能力和执行力，能够快速理解业务并推进落地
- 具备良好的沟通协作能力，能独立负责模块开发并推动问题解决`;
}

export const resumeTemplateTool = tool({
  description:
    "Get a programmer resume template. Use this when the user asks for a resume template or wants a sample resume structure.",
  inputSchema: z.object({}),
  execute: async () => {
    const template = await getResumeTemplate();

    return {
      template,
    };
  },
});
