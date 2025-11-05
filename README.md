# 试题图片组合网站

一个用于查询、组合和导出试题的Web应用。

## 功能特性

- 试题查询（按年级、学科、知识点）
- 试题浏览（翻页查看）
- 试题组合（手动勾选或一键生成）
- PDF导出（试题组和答案组）
- 用户权限管理（未登录、注册用户、VIP用户）
- VIP充值系统
- 微信支付集成

## 技术栈

- 前端：Vue 3 + Vite + Element Plus
- 后端：Node.js + Express + PostgreSQL
- PDF生成：pdfkit

## 项目结构

```
educlient/
├── frontend/          # 前端项目
├── backend/           # 后端项目
└── database/          # 数据库脚本
```

## 快速开始

### 安装依赖

```bash
npm run install:all
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 数据库配置

请确保PostgreSQL数据库已配置，并执行 `database/schema.sql` 中的SQL脚本。

## 环境变量

后端需要配置以下环境变量（在 `backend/.env` 中）：

- DATABASE_URL: PostgreSQL连接字符串
- JWT_SECRET: JWT密钥
- WECHAT_APPID: 微信支付AppID
- WECHAT_MCHID: 微信商户号
- WECHAT_KEY: 微信支付密钥

