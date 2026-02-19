# PMStation 部署指南

本文档详细说明如何将 PMStation 部署到生产环境。

---

## 目录

1. [前置准备](#1-前置准备)
2. [Google OAuth 配置](#2-google-oauth-配置)
3. [Gemini API 配置](#3-gemini-api-配置)
4. [数据库部署 (Railway)](#4-数据库部署-railway)
5. [后端部署 (Railway)](#5-后端部署-railway)
6. [前端部署 (Vercel)](#6-前端部署-vercel)
7. [域名配置](#7-域名配置)
8. [监控与运维](#8-监控与运维)

---

## 1. 前置准备

### 1.1 需要的账号

| 服务 | 用途 | 注册地址 |
|------|------|---------|
| Google Cloud | OAuth 登录 + Gemini API | https://console.cloud.google.com |
| Railway | 后端 + 数据库托管 | https://railway.app |
| Vercel | 前端托管 | https://vercel.com |
| GitHub | 代码仓库 | https://github.com |

### 1.2 推送代码到 GitHub

```bash
cd pmstation

# 初始化 Git 仓库
git init

# 创建 .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
venv/
.venv/

# Environment
.env
.env.local
.env.production

# Build
.next/
dist/
build/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF

# 添加所有文件
git add .
git commit -m "Initial commit: PMStation project setup"

# 推送到 GitHub (需要先在 GitHub 创建仓库)
git remote add origin https://github.com/YOUR_USERNAME/pmstation.git
git branch -M main
git push -u origin main
```

---

## 2. Google OAuth 配置

### 2.1 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com)
2. 点击顶部项目选择器 → **新建项目**
3. 项目名称：`PMStation`
4. 点击 **创建**

### 2.2 配置 OAuth 同意屏幕

1. 导航到 **API 和服务** → **OAuth 同意屏幕**
2. 选择 **外部** (External) → 点击 **创建**
3. 填写信息：
   - 应用名称：`PMStation`
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
4. 点击 **保存并继续**
5. **范围** 页面：点击 **添加或移除范围**
   - 选择：`email`, `profile`, `openid`
   - 点击 **更新** → **保存并继续**
6. **测试用户** 页面：点击 **保存并继续**
7. **摘要** 页面：点击 **返回到信息中心**

### 2.3 创建 OAuth 凭据

1. 导航到 **API 和服务** → **凭据**
2. 点击 **创建凭据** → **OAuth 客户端 ID**
3. 应用类型：**Web 应用**
4. 名称：`PMStation Web Client`
5. **已授权的 JavaScript 来源**：
   ```
   http://localhost:3000
   https://your-app.vercel.app
   https://yourdomain.com (如果有自定义域名)
   ```
6. **已授权的重定向 URI**：
   ```
   http://localhost:3000/auth/callback
   https://your-app.vercel.app/auth/callback
   https://yourdomain.com/auth/callback
   ```
7. 点击 **创建**
8. 记录下 **客户端 ID** 和 **客户端密钥**

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

---

## 3. Gemini API 配置

### 3.1 启用 Gemini API

1. 在 Google Cloud Console，导航到 **API 和服务** → **库**
2. 搜索 `Generative Language API`
3. 点击进入 → 点击 **启用**

### 3.2 创建 API 密钥

1. 导航到 **API 和服务** → **凭据**
2. 点击 **创建凭据** → **API 密钥**
3. 点击创建的 API 密钥 → **编辑 API 密钥**
4. **应用限制**：选择 **无** (或根据需要配置)
5. **API 限制**：选择 **限制密钥** → 选择 `Generative Language API`
6. 点击 **保存**
7. 记录下 API 密钥

```
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx
```

---

## 4. 数据库部署 (Railway)

### 4.1 创建 Railway 项目

1. 访问 [Railway](https://railway.app) 并登录
2. 点击 **New Project** → **Provision PostgreSQL**
3. 等待数据库创建完成

### 4.2 获取数据库连接信息

1. 点击创建的 PostgreSQL 服务
2. 进入 **Variables** 标签
3. 找到以下变量：
   - `DATABASE_URL`
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

4. 复制 `DATABASE_URL`，格式如下：
```
postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway
```

5. 转换为 asyncpg 格式（将 `postgresql://` 改为 `postgresql+asyncpg://`）：
```
DATABASE_URL=postgresql+asyncpg://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway
```

---

## 5. 后端部署 (Railway)

### 5.1 从 GitHub 部署

1. 在 Railway 项目中，点击 **New** → **GitHub Repo**
2. 选择你的 `pmstation` 仓库
3. Railway 会自动检测项目

### 5.2 配置服务设置

1. 点击新创建的服务
2. 进入 **Settings** 标签
3. 配置以下设置：

**Root Directory**
```
backend
```

**Start Command**
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 5.3 配置环境变量

进入 **Variables** 标签，添加以下变量：

```bash
# 应用配置
APP_NAME=PMStation
DEBUG=false

# 数据库 (使用上面获取的连接字符串)
DATABASE_URL=postgresql+asyncpg://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway

# JWT 密钥 (生成一个安全的随机字符串)
SECRET_KEY=your-super-secret-key-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Gemini API
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx

# CORS (填写你的前端域名)
CORS_ORIGINS=["https://your-app.vercel.app","https://yourdomain.com"]
```

### 5.4 生成安全的 SECRET_KEY

```bash
# 使用 Python 生成
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 或使用 OpenSSL
openssl rand -base64 32
```

### 5.5 关联数据库

1. 在 Railway 项目中，选择后端服务
2. 进入 **Variables** 标签
3. 点击 **Add Reference** → 选择 PostgreSQL 服务的 `DATABASE_URL`
4. 或者直接使用上面手动配置的 DATABASE_URL

### 5.6 部署验证

1. 等待部署完成（查看 **Deployments** 标签）
2. 点击生成的域名访问 API
3. 访问 `https://your-backend.railway.app/docs` 查看 API 文档
4. 访问 `https://your-backend.railway.app/health` 检查健康状态

记录后端 URL：
```
BACKEND_URL=https://pmstation-backend-xxxx.railway.app
```

---

## 6. 前端部署 (Vercel)

### 6.1 导入项目

1. 访问 [Vercel](https://vercel.com) 并登录
2. 点击 **Add New...** → **Project**
3. 选择 **Import Git Repository**
4. 选择你的 `pmstation` 仓库
5. 点击 **Import**

### 6.2 配置项目设置

在导入配置页面：

**Framework Preset**: Next.js

**Root Directory**: `frontend`

**Build Command**: `npm run build`

**Output Directory**: `.next`

### 6.3 配置环境变量

在 **Environment Variables** 部分添加：

```bash
NEXT_PUBLIC_API_URL=https://pmstation-backend-xxxx.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
```

### 6.4 部署

1. 点击 **Deploy**
2. 等待部署完成
3. 访问生成的域名验证

记录前端 URL：
```
FRONTEND_URL=https://pmstation-xxxx.vercel.app
```

### 6.5 更新后端 CORS 配置

回到 Railway，更新后端的 `CORS_ORIGINS` 环境变量：

```bash
CORS_ORIGINS=["https://pmstation-xxxx.vercel.app"]
```

### 6.6 更新 Google OAuth 配置

回到 Google Cloud Console → 凭据 → 编辑 OAuth 客户端：

1. **已授权的 JavaScript 来源** 添加：
   ```
   https://pmstation-xxxx.vercel.app
   ```

2. **已授权的重定向 URI** 添加：
   ```
   https://pmstation-xxxx.vercel.app/auth/callback
   ```

---

## 7. 域名配置

### 7.1 Vercel 自定义域名

1. 在 Vercel 项目中，进入 **Settings** → **Domains**
2. 添加你的域名：`pmstation.yourdomain.com`
3. 按照提示配置 DNS 记录：
   - 类型：CNAME
   - 名称：pmstation
   - 值：cname.vercel-dns.com

### 7.2 Railway 自定义域名

1. 在 Railway 后端服务中，进入 **Settings** → **Networking**
2. 点击 **Generate Domain** 生成 Railway 域名
3. 或添加自定义域名：`api.pmstation.yourdomain.com`
4. 配置 DNS 记录：
   - 类型：CNAME
   - 名称：api.pmstation
   - 值：(Railway 提供的值)

### 7.3 更新环境变量

使用自定义域名后，更新相关配置：

**Railway 后端**
```bash
CORS_ORIGINS=["https://pmstation.yourdomain.com"]
```

**Vercel 前端**
```bash
NEXT_PUBLIC_API_URL=https://api.pmstation.yourdomain.com
```

**Google OAuth**
- 更新已授权的来源和重定向 URI

---

## 8. 监控与运维

### 8.1 Railway 监控

Railway 自带监控功能：

1. **Metrics**: CPU、内存、网络使用情况
2. **Logs**: 实时日志查看
3. **Deployments**: 部署历史

### 8.2 Vercel 监控

1. **Analytics**: 页面访问统计（需开启）
2. **Logs**: 函数执行日志
3. **Speed Insights**: 性能监控

### 8.3 错误追踪 (可选)

推荐集成 Sentry：

**后端 (FastAPI)**
```bash
pip install sentry-sdk[fastapi]
```

```python
# app/main.py
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0,
)
```

**前端 (Next.js)**
```bash
npm install @sentry/nextjs
```

### 8.4 数据库备份

Railway PostgreSQL 自动备份，但建议定期导出：

```bash
# 使用 pg_dump 导出
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 8.5 扩容策略

**Railway**
- 可在 Settings 中调整资源配额
- 支持自动扩容

**Vercel**
- 自动扩容
- Pro 计划支持更多并发

---

## 环境变量完整参考

### 后端 (Railway)

```bash
# 应用
APP_NAME=PMStation
DEBUG=false

# 数据库
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# JWT
SECRET_KEY=your-secret-key-32-chars-minimum
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Gemini
GEMINI_API_KEY=AIzaSy-xxx

# CORS
CORS_ORIGINS=["https://your-frontend-domain.com"]
```

### 前端 (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## 常见问题

### Q1: CORS 错误

确保后端 `CORS_ORIGINS` 包含前端域名（完整 URL，包括 `https://`）

### Q2: Google 登录失败

检查：
1. OAuth 同意屏幕是否已发布
2. 已授权的来源和重定向 URI 是否正确
3. Client ID 在前后端是否一致

### Q3: 数据库连接失败

检查：
1. DATABASE_URL 格式是否正确（使用 `postgresql+asyncpg://`）
2. Railway 数据库是否正常运行
3. 网络连接是否正常

### Q4: Gemini API 调用失败

检查：
1. API 密钥是否有效
2. Generative Language API 是否已启用
3. 是否超出配额限制

---

## 部署检查清单

- [ ] Google Cloud 项目已创建
- [ ] OAuth 同意屏幕已配置
- [ ] OAuth 凭据已创建并记录
- [ ] Gemini API 已启用
- [ ] API 密钥已创建并记录
- [ ] Railway PostgreSQL 已创建
- [ ] Railway 后端服务已部署
- [ ] 后端环境变量已配置
- [ ] 后端 API 可访问 (/health 返回 200)
- [ ] Vercel 前端已部署
- [ ] 前端环境变量已配置
- [ ] Google OAuth 来源和重定向 URI 已更新
- [ ] 登录功能正常
- [ ] 创建项目功能正常
- [ ] AI 生成功能正常

---

## 联系支持

如遇到问题，请：
1. 查看 Railway/Vercel 部署日志
2. 检查浏览器控制台错误
3. 提交 GitHub Issue
