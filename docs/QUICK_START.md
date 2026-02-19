# PMStation 快速部署指南

5 分钟完成部署的精简版本。

---

## 第一步：获取密钥 (约 10 分钟)

### 1.1 Google OAuth

1. 访问 https://console.cloud.google.com
2. 创建项目 → API和服务 → 凭据 → 创建OAuth客户端ID
3. 类型选"Web应用"，添加来源和重定向URI：
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
4. 记录 `Client ID` 和 `Client Secret`

### 1.2 Gemini API

1. 同一项目中，API和服务 → 库 → 搜索 "Generative Language API" → 启用
2. 凭据 → 创建凭据 → API密钥
3. 记录 `API Key`

---

## 第二步：部署后端 (约 5 分钟)

### 2.1 Railway 部署

1. 访问 https://railway.app → 登录
2. New Project → Deploy from GitHub repo → 选择仓库
3. 点击服务 → Settings：
   - Root Directory: `backend`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2.2 添加数据库

1. 项目中点击 New → Database → PostgreSQL
2. 等待创建完成

### 2.3 配置环境变量

服务 → Variables → Raw Editor，粘贴：

```
APP_NAME=PMStation
DEBUG=false
DATABASE_URL=${POSTGRES_URL}
SECRET_KEY=生成一个32位随机字符串
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
GOOGLE_CLIENT_ID=你的Client_ID
GOOGLE_CLIENT_SECRET=你的Client_Secret
GEMINI_API_KEY=你的API_Key
CORS_ORIGINS=["http://localhost:3000"]
```

4. 等待重新部署，记录生成的URL

---

## 第三步：部署前端 (约 3 分钟)

### 3.1 Vercel 部署

1. 访问 https://vercel.com → 登录
2. Add New → Project → Import 你的仓库
3. 配置：
   - Root Directory: `frontend`
   - Framework: Next.js

### 3.2 环境变量

```
NEXT_PUBLIC_API_URL=https://你的railway后端URL
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的Client_ID
```

4. Deploy

---

## 第四步：更新配置

### 4.1 更新 Railway CORS

```
CORS_ORIGINS=["https://你的vercel前端URL"]
```

### 4.2 更新 Google OAuth

在 Google Cloud Console 添加：
- 已授权来源: `https://你的vercel前端URL`
- 重定向URI: `https://你的vercel前端URL/auth/callback`

---

## 完成！

访问你的 Vercel URL，使用 Google 账号登录即可开始使用。

---

## 本地开发

```bash
# 后端
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # 编辑配置
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
cp .env.example .env.local  # 编辑配置
npm run dev
```

访问 http://localhost:3000
