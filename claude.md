# PMStation - 产品经理AI工作站

> 基于 Google Gemini API 的智能产品经理助手平台

---

## 项目概述

PMStation 是一个专为产品经理设计的 AI 驱动工作平台，集成 Google Gemini 最新 API 能力，旨在自动化和增强产品经理的核心工作流程，包括需求分析、PRD 文档撰写、用户研究、竞品分析等。

### 核心价值主张

- **效率提升**：将传统需要数天完成的 PRD 文档压缩至数小时
- **质量保障**：基于 AI 的需求分析确保需求完整性和一致性
- **协作增强**：智能文档生成支持多角色（开发、测试、设计）理解
- **决策支持**：数据驱动的产品决策辅助

---

## 技术栈

### Gemini API 模型选择指南

| 使用场景 | 推荐模型 | 模型代码 | 原因 |
|---------|---------|---------|------|
| PRD 深度撰写 | Gemini 3 Pro | `gemini-3-pro-preview` | 最强推理能力，复杂文档生成 |
| 需求快速分析 | Gemini 3 Flash | `gemini-3-flash-preview` | 速度与智能的平衡 |
| 批量文档处理 | Gemini 2.5 Flash | `gemini-2.5-flash` | 大规模处理，低延迟 |
| 成本敏感任务 | Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | 最优成本效率 |
| 复杂推理任务 | Gemini 2.5 Pro | `gemini-2.5-pro` | 深度思考和复杂问题推理 |
| 原型图生成 | Nano Banana Pro | - | 最高质量图像生成 |

### API 定价参考 (2026)

| 模型 | 输入 (每百万 Token) | 输出 (每百万 Token) |
|-----|---------------------|---------------------|
| Gemini 3 Pro | $2.00 | $12.00 |
| Gemini 3 Flash | $0.50 | $3.00 |
| Gemini 2.5 Pro | $1.25 | $10.00 |
| Gemini 2.5 Flash | $0.10 | $0.40 |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 |

### 核心技术能力

- **上下文窗口**：最高支持 1M tokens 输入，65K tokens 输出
- **多模态支持**：文本、图像、视频、音频、PDF
- **函数调用**：支持 Agent 工作流和工具调用
- **结构化输出**：JSON Schema 约束输出
- **内置工具**：Google Search、Maps、Code Execution

---

## 产品经理工作流程模块

### 1. 需求管理模块 (Requirement Management)

```
需求收集 → 需求分析 → 需求验证 → 需求优先级 → 需求追踪
```

**AI 增强能力：**
- 自动识别用户反馈中的潜在需求
- 需求真伪判断（真需求 vs 伪需求）
- 智能优先级排序（价值/成本矩阵）
- 需求冲突检测

### 2. PRD 文档生成模块 (PRD Generator)

**标准 PRD 结构：**

```markdown
1. 文档信息
   - 版本号、作者、日期、状态

2. 产品概述
   - 背景与目的
   - 目标用户
   - 核心价值

3. 功能需求
   - 功能列表
   - 用户故事
   - 验收标准

4. 业务流程
   - 业务流程图
   - 状态机图
   - 时序图

5. 界面原型
   - 页面结构
   - 交互说明
   - 异常处理

6. 非功能需求
   - 性能要求
   - 安全要求
   - 兼容性要求

7. 数据需求
   - 数据字典
   - 埋点设计

8. 排期与里程碑
```

**AI 生成模式：**
- `quick`：快速生成框架，适合内部讨论
- `standard`：标准 PRD，适合评审会议
- `detailed`：详细 PRD，适合开发交付

### 3. 用户研究模块 (User Research)

**支持的研究方法：**
- 用户画像 (Persona) 生成
- 用户旅程地图 (Customer Journey Map)
- 用户故事 (User Story) 撰写
- 访谈问题设计
- 问卷调查设计
- 可用性测试计划

**输出格式：**
- Markdown 文档
- Mermaid 流程图
- JSON 结构化数据

### 4. 竞品分析模块 (Competitive Analysis)

**分析维度：**
- 功能对比矩阵
- 定价策略分析
- 用户体验评估
- 技术架构推测
- SWOT 分析
- 市场定位图

### 5. 商业文档模块 (Business Documents)

**支持文档类型：**
- BRD (Business Requirement Document) - 商业需求文档
- MRD (Market Requirement Document) - 市场需求文档
- 商业计划书
- 产品路线图
- 版本发布说明

---

## 项目架构

```
pmstation/
├── src/
│   ├── core/                    # 核心模块
│   │   ├── gemini/              # Gemini API 封装
│   │   │   ├── client.ts        # API 客户端
│   │   │   ├── models.ts        # 模型配置
│   │   │   └── prompts/         # Prompt 模板
│   │   └── agents/              # AI Agent 定义
│   │       ├── prd-agent.ts     # PRD 生成 Agent
│   │       ├── research-agent.ts # 用户研究 Agent
│   │       └── analysis-agent.ts # 分析 Agent
│   │
│   ├── modules/                 # 功能模块
│   │   ├── requirement/         # 需求管理
│   │   ├── prd/                 # PRD 生成
│   │   ├── research/            # 用户研究
│   │   ├── competitive/         # 竞品分析
│   │   └── documents/           # 文档生成
│   │
│   ├── templates/               # 文档模板
│   │   ├── prd/                 # PRD 模板
│   │   ├── research/            # 研究报告模板
│   │   └── analysis/            # 分析报告模板
│   │
│   ├── utils/                   # 工具函数
│   │   ├── markdown.ts          # Markdown 处理
│   │   ├── mermaid.ts           # 图表生成
│   │   └── export.ts            # 导出功能
│   │
│   └── types/                   # TypeScript 类型
│
├── prompts/                     # Prompt 工程
│   ├── system/                  # 系统提示词
│   ├── tasks/                   # 任务提示词
│   └── examples/                # Few-shot 示例
│
├── docs/                        # 项目文档
├── tests/                       # 测试文件
└── scripts/                     # 构建脚本
```

---

## Gemini API 集成指南

### 快速开始

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

// 初始化客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 选择模型
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 8192,
  }
});

// 生成内容
const result = await model.generateContent(prompt);
```

### 结构化输出 (PRD JSON)

```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-3-pro-preview",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        version: { type: "string" },
        features: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
              userStories: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  }
});
```

### 函数调用 (Agent 工具)

```typescript
const tools = [
  {
    name: "searchCompetitors",
    description: "搜索竞品信息",
    parameters: {
      type: "object",
      properties: {
        productName: { type: "string", description: "产品名称" },
        industry: { type: "string", description: "行业领域" }
      },
      required: ["productName"]
    }
  },
  {
    name: "generateFlowchart",
    description: "生成业务流程图",
    parameters: {
      type: "object",
      properties: {
        process: { type: "string", description: "流程描述" },
        format: { type: "string", enum: ["mermaid", "plantuml"] }
      }
    }
  }
];

const model = genAI.getGenerativeModel({
  model: "gemini-3-pro-preview",
  tools: tools
});
```

### 长文档处理

```typescript
// 处理 PDF 文档（最高支持 1000 页）
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

const uploadResult = await fileManager.uploadFile("requirements.pdf", {
  mimeType: "application/pdf",
  displayName: "需求文档"
});

const result = await model.generateContent([
  { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
  { text: "分析这份需求文档，提取核心功能点和用户故事" }
]);
```

---

## Prompt 工程规范

### 系统提示词模板

```markdown
# 角色定义
你是一位资深产品经理助手，专注于帮助产品经理完成日常工作。

# 核心能力
- PRD 文档撰写
- 需求分析与优先级排序
- 用户研究方法论
- 竞品分析框架
- 商业文档撰写

# 输出规范
- 使用中文输出
- 遵循标准 PRD 格式
- 提供结构化、可执行的内容
- 标注关键假设和待验证项

# 质量标准
- 需求描述完整（Who/What/Why/When/Where）
- 验收标准明确（Given/When/Then）
- 边界条件清晰
- 异常流程覆盖
```

### 任务提示词示例

#### PRD 生成

```markdown
## 任务
根据以下需求描述，生成完整的 PRD 文档。

## 输入
{requirement_description}

## 输出要求
1. 使用标准 PRD 模板
2. 包含用户故事（As a... I want... So that...）
3. 包含验收标准（Given/When/Then）
4. 生成 Mermaid 格式的业务流程图
5. 列出技术要点和风险项

## 格式
Markdown 格式，支持 Mermaid 图表
```

#### 需求分析

```markdown
## 任务
分析以下用户反馈/需求，判断其价值和优先级。

## 输入
{user_feedback}

## 分析维度
1. 需求真伪判断
2. 用户价值评估（1-10）
3. 商业价值评估（1-10）
4. 实现成本评估（1-10）
5. 优先级建议（P0-P3）
6. 相关联需求

## 输出
JSON 格式的分析结果
```

---

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint + Prettier 配置
- 单元测试覆盖率 > 80%
- 使用语义化版本控制

### 命名规范

- 文件名：kebab-case（如 `prd-generator.ts`）
- 类名：PascalCase（如 `PrdGenerator`）
- 函数/变量：camelCase（如 `generatePrd`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_TOKENS`）

### Git 提交规范

```
<type>(<scope>): <subject>

类型：
- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建/工具
```

### 错误处理

```typescript
// 统一错误类型
class PMStationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PMStationError';
  }
}

// API 错误重试机制
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 安全规范

### API 密钥管理

- 使用环境变量存储 API 密钥
- 禁止在代码中硬编码密钥
- 使用 `.env.local` 进行本地开发
- 生产环境使用密钥管理服务

### 数据安全

- 敏感数据不传输至 AI 模型
- 用户数据本地处理优先
- 实施数据脱敏策略
- 定期审计 API 调用日志

### 输入验证

```typescript
// 使用 Zod 进行输入验证
import { z } from 'zod';

const RequirementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(10000),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  tags: z.array(z.string()).optional()
});
```

---

## 质量保障

### 测试策略

| 层级 | 工具 | 覆盖率目标 |
|-----|------|----------|
| 单元测试 | Jest/Vitest | > 80% |
| 集成测试 | Playwright | 关键路径 |
| E2E 测试 | Cypress | 核心功能 |
| Prompt 测试 | 自定义框架 | 关键场景 |

### Prompt 质量评估

```typescript
interface PromptEvaluation {
  relevance: number;      // 相关性 (0-1)
  completeness: number;   // 完整性 (0-1)
  accuracy: number;       // 准确性 (0-1)
  formatting: number;     // 格式规范 (0-1)
}

// 使用 Gemini 进行自动化评估
async function evaluateOutput(
  prompt: string,
  output: string,
  criteria: string[]
): Promise<PromptEvaluation> {
  // 实现评估逻辑
}
```

---

## 部署与运维

### 环境配置

```bash
# 开发环境
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3-flash-preview
LOG_LEVEL=debug

# 生产环境
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-3-pro-preview
LOG_LEVEL=info
RATE_LIMIT_RPM=60
```

### 监控指标

- API 调用成功率
- 平均响应时间
- Token 使用量
- 错误率分类
- 用户满意度

---

## 参考资源

### Gemini API 文档

- [Gemini API 官方文档](https://ai.google.dev/gemini-api/docs)
- [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models)
- [Gemini 3 开发指南](https://ai.google.dev/gemini-api/docs/gemini-3)
- [API 更新日志](https://ai.google.dev/gemini-api/docs/changelog)
- [定价信息](https://ai.google.dev/gemini-api/docs/pricing)

### 产品经理资源

- [人人都是产品经理](https://www.woshipm.com/)
- [PRD 撰写指南](https://www.woshipm.com/pmd/21446.html)
- [产品管理流程规范](https://www.woshipm.com/pmd/4053610.html)

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| 0.1.0 | 2026-02-15 | 项目初始化，核心架构设计 |

---

*本文档由 Claude Code 自动生成，基于 Gemini API 最新文档和产品经理最佳实践*
