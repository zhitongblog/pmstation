# 环境变量配置模板

复制以下内容，填写你的配置信息。

---

## 后端环境变量 (Railway)

```bash
# ==========================================
# PMStation Backend Environment Variables
# ==========================================

# 应用配置
APP_NAME=PMStation
DEBUG=false

# 数据库配置
# Railway 自动注入，使用变量引用
DATABASE_URL=${POSTGRES_URL}

# JWT 配置
# 使用以下命令生成: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=__YOUR_SECRET_KEY__
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google OAuth
# 从 Google Cloud Console 获取
GOOGLE_CLIENT_ID=__YOUR_GOOGLE_CLIENT_ID__.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-__YOUR_GOOGLE_CLIENT_SECRET__

# Gemini API
# 从 Google Cloud Console 获取
GEMINI_API_KEY=AIzaSy__YOUR_GEMINI_API_KEY__

# CORS 配置
# 填写你的前端域名
CORS_ORIGINS=["https://__YOUR_FRONTEND_DOMAIN__"]
```

---

## 前端环境变量 (Vercel)

```bash
# ==========================================
# PMStation Frontend Environment Variables
# ==========================================

# 后端 API 地址
NEXT_PUBLIC_API_URL=https://__YOUR_BACKEND_DOMAIN__

# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=__YOUR_GOOGLE_CLIENT_ID__.apps.googleusercontent.com
```

---

## 本地开发环境变量

### backend/.env

```bash
APP_NAME=PMStation
DEBUG=true
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pmstation
SECRET_KEY=dev-secret-key-not-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
GOOGLE_CLIENT_ID=__YOUR_GOOGLE_CLIENT_ID__.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-__YOUR_GOOGLE_CLIENT_SECRET__
GEMINI_API_KEY=AIzaSy__YOUR_GEMINI_API_KEY__
CORS_ORIGINS=["http://localhost:3000"]
```

### frontend/.env.local

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=__YOUR_GOOGLE_CLIENT_ID__.apps.googleusercontent.com
```

---

## 配置获取指南

### Google OAuth 凭据

1. 访问 https://console.cloud.google.com
2. 创建或选择项目
3. 导航到 **API和服务** → **凭据**
4. 点击 **创建凭据** → **OAuth 客户端 ID**
5. 选择 **Web 应用**
6. 配置已授权来源和重定向 URI
7. 复制 **客户端 ID** 和 **客户端密钥**

### Gemini API Key

1. 在同一项目中，导航到 **API和服务** → **库**
2. 搜索并启用 **Generative Language API**
3. 导航到 **凭据** → **创建凭据** → **API 密钥**
4. 复制 API 密钥

### SECRET_KEY 生成

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Google OAuth 授权配置

### 开发环境

**已授权的 JavaScript 来源**
```
http://localhost:3000
```

**已授权的重定向 URI**
```
http://localhost:3000/auth/callback
```

### 生产环境

**已授权的 JavaScript 来源**
```
https://your-app.vercel.app
https://yourdomain.com (如有自定义域名)
```

**已授权的重定向 URI**
```
https://your-app.vercel.app/auth/callback
https://yourdomain.com/auth/callback (如有自定义域名)
```
