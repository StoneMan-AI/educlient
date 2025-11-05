# 数据库设置说明

## 1. 创建数据库

首先在PostgreSQL中创建数据库：

```sql
CREATE DATABASE educlient;
```

## 2. 执行基础表结构

执行 `schema.sql` 文件（如果还没有执行的话）来创建基础表结构：
- subjects（学科表）
- grades（年级表）
- question_types（题型表）
- knowledge_points（知识点表）
- difficulty_levels（难度级别表）
- questions（题目表）

## 3. 执行扩展表结构

执行 `schema_extension.sql` 文件来创建扩展表：
- users（用户表）
- vip_memberships（VIP会员表）
- orders（订单表）
- user_downloaded_questions（用户已下载试题记录表）
- user_favorite_questions（用户收藏试题表）
- question_groups（试题组表）
- guest_access_logs（未登录用户访问记录表）
- user_answer_views（用户查看答案记录表）

## 4. 配置连接字符串

在 `backend/.env` 文件中配置数据库连接：

```
DATABASE_URL=postgresql://username:password@localhost:5432/educlient
```

## 注意事项

- 确保PostgreSQL服务正在运行
- 确保数据库用户有足够的权限创建表和索引
- 试题图片路径需要正确配置，图片文件应该存储在可访问的位置

