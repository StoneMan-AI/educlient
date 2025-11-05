# 项目设置指南

## 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 12.0
- npm 或 yarn

## 安装步骤

### 1. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

或使用一键安装：

```bash
npm run install:all
```

### 2. 配置数据库

1. 创建PostgreSQL数据库：
```sql
CREATE DATABASE educlient;
```

2. 执行数据库脚本：
```bash
# 执行基础表结构（如果还没有）
psql -U username -d educlient -f database/schema.sql

# 执行扩展表结构
psql -U username -d educlient -f database/schema_extension.sql
```

### 3. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`，并填写配置：

```env
DATABASE_URL=postgresql://username:password@localhost:5432/educlient
JWT_SECRET=your-secret-key-here
WECHAT_APPID=your-appid
WECHAT_MCHID=your-merchant-id
WECHAT_KEY=your-api-key
PORT=3001
NODE_ENV=development
```

### 4. 启动开发服务器

```bash
# 在项目根目录运行
npm run dev
```

这将同时启动前端（端口3000）和后端（端口3001）。

### 5. 访问应用

打开浏览器访问：http://localhost:3000

## 项目结构

```
educlient/
├── frontend/              # 前端项目（Vue 3）
│   ├── src/
│   │   ├── api/          # API接口
│   │   ├── components/   # 组件
│   │   ├── router/       # 路由配置
│   │   ├── stores/       # 状态管理
│   │   └── views/        # 页面
│   └── package.json
├── backend/               # 后端项目（Node.js + Express）
│   ├── routes/           # 路由
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── server.js        # 服务器入口
├── database/            # 数据库脚本
└── package.json
```

## 功能特性

### 已实现功能

- ✅ 用户注册/登录（手机号）
- ✅ 试题查询（年级、学科、知识点）
- ✅ 试题展示（翻页浏览）
- ✅ 试题组合（手动勾选/一键生成）
- ✅ PDF导出（试题组）
- ✅ 用户权限管理（未登录、注册用户、VIP）
- ✅ VIP充值系统
- ✅ 未登录用户限流（3题/3分钟）
- ✅ 支付流程（查看答案、下载）

### 待完善功能

- ⚠️ 微信支付集成（当前为模拟）
- ⚠️ 短信验证码发送（当前为模拟）
- ⚠️ PDF中的图片处理（需要配置图片路径）
- ⚠️ VIP用户答案PDF下载（当前仅生成试题组PDF）

## 开发说明

### 前端开发

```bash
cd frontend
npm run dev
```

### 后端开发

```bash
cd backend
npm run dev
```

### 构建生产版本

```bash
cd frontend
npm run build
```

## 常见问题

### 1. 数据库连接失败

检查：
- PostgreSQL服务是否运行
- DATABASE_URL配置是否正确
- 数据库用户权限是否足够

### 2. 端口被占用

修改 `frontend/vite.config.js` 和 `backend/server.js` 中的端口配置

### 3. 图片无法显示

确保：
- 图片路径配置正确
- 后端静态文件服务配置正确
- 图片文件实际存在

## 技术支持

如有问题，请查看：
- 数据库脚本：`database/` 目录
- API文档：查看 `backend/routes/` 目录下的路由文件
- 前端组件：查看 `frontend/src/` 目录

