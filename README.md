# PMStation - AI 产品经理工作站

基于 Google Gemini API 的智能产品经理助手平台。从创意到 PRD，AI 帮你完成产品设计全流程。

## 功能特点

- **Google 账户登录** - 安全便捷的身份认证
- **完整工作流** - 创意 → 方向 → 功能 → 原型 → Demo → PRD → 测试用例
- **AI 智能生成** - 基于 Gemini API 自动生成内容
- **多用户协作** - 邀请团队成员查看项目、添加备注
- **权限控制** - 创建者完全控制，协作者只读+备注

## 技术栈

### 前端
- Next.js 14 + TypeScript
- Tailwind CSS
- Zustand (状态管理)
- React Query

### 后端
- Python FastAPI
- SQLAlchemy + PostgreSQL
- Google Generative AI SDK

### 部署
- 前端: Vercel
- 后端: Railway
- 数据库: Railway PostgreSQL

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd pmstation
```

### 2. 配置环境变量

**后端 (`backend/.env`)**
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pmstation
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGINS=["http://localhost:3000"]
```

**前端 (`frontend/.env.local`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动数据库 (使用 Docker)
docker-compose up -d db

# 启动服务
uvicorn app.main:app --reload
```

### 4. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
pmstation/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/          # API 路由
│   │   ├── models/          # 数据库模型
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── ai/              # AI Agent 实现
│   │   │   ├── agents/      # 各阶段 Agent
│   │   │   └── prompts/     # Prompt 模板
│   │   └── core/            # 核心模块 (认证、权限)
│   └── requirements.txt
│
├── frontend/                # Next.js 前端
│   ├── src/
│   │   ├── app/             # 页面路由
│   │   ├── components/      # UI 组件
│   │   ├── stores/          # 状态管理
│   │   ├── lib/             # 工具函数和 API
│   │   └── types/           # TypeScript 类型
│   └── package.json
│
└── CLAUDE.md                # 项目规范文档
```

## API 文档

启动后端后访问: http://localhost:8000/docs

## 工作流阶段

| 阶段 | 说明 | AI 模型 |
|------|------|---------|
| Idea | 输入产品想法 | - |
| Direction | 生成 3-5 个产品方向 | Gemini Pro |
| Features | 生成功能模块树 | Gemini Pro |
| Prototype | 生成界面原型描述 | Gemini Pro |
| Demo | 生成 React Demo 代码 | Gemini Pro |
| PRD | 生成详细 PRD 文档 | Gemini Pro |
| TestCases | 生成测试用例 | Gemini Flash |

## 许可证

MIT
