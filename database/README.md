# 数据库部署说明

## 快速部署

**只需执行一个SQL文件即可完成整个项目的数据库部署：**

```bash
psql -d your_database -f database/deploy.sql
```

## 文件说明

### 主要文件

- **`deploy.sql`** - **完整数据库部署文件（推荐使用）**
  - 整合了所有表结构、价格配置和迁移操作
  - 按正确顺序执行所有操作
  - 可以安全地重复执行（幂等性）
  - 适合新项目部署和现有项目更新

### 其他文件（已整合到deploy.sql，可忽略）

- `schema_extension.sql` - 扩展表结构（已整合）
- `pricing_config.sql` - 价格配置表（已整合）
- `update_download_pricing.sql` - 下载价格更新（已整合）
- `update_test_pricing.sql` - 测试价格更新（已整合）
- `migrations/2025-01-XX-complete-migration.sql` - 迁移文件（已整合）

## 部署前准备

1. **创建数据库**：
   ```sql
   CREATE DATABASE educlient;
   ```

2. **确保基础表结构已存在**：
   - `subjects`（学科表）
   - `grades`（年级表）
   - `question_types`（题型表）
   - `knowledge_points`（知识点表）
   - `difficulty_levels`（难度级别表）
   - `questions`（题目表）
   
   如果这些表不存在，请先执行基础表结构的SQL文件（如果有的话）。

3. **配置数据库连接**：
   在 `backend/.env` 文件中配置：
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/educlient
   ```

## 部署步骤

### 方式一：使用完整部署文件（推荐）

```bash
# 连接到PostgreSQL数据库
psql -d educlient -U your_username

# 执行部署文件
\i database/deploy.sql
```

或者直接执行：
```bash
psql -d educlient -U your_username -f database/deploy.sql
```

### 方式二：使用psql命令行

```bash
psql -d educlient -U your_username -f database/deploy.sql
```

## 部署内容

`deploy.sql` 文件包含以下内容：

1. **创建辅助函数** - `update_updated_at_column()` 触发器函数
2. **创建扩展表结构** - 所有业务表（用户、VIP、订单等）
3. **创建索引** - 所有必要的索引
4. **创建触发器** - 自动更新时间戳
5. **添加外键约束** - 表之间的关联关系
6. **创建价格配置表** - `pricing_config` 表
7. **添加年级** - G13（中考）和G14（高考）
8. **插入价格配置** - 所有价格配置（查看答案、下载、VIP等）
9. **创建视图** - `user_vip_status` 视图
10. **添加注释** - 表和字段注释

## 验证部署

部署完成后，可以使用以下SQL验证：

```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 检查价格配置数量
SELECT config_type, duration_months, COUNT(*) as count, is_test_mode
FROM pricing_config
WHERE is_active = TRUE
GROUP BY config_type, duration_months, is_test_mode
ORDER BY config_type, duration_months, is_test_mode;

-- 检查G13和G14是否已添加
SELECT id, name, code FROM grades WHERE code IN ('G13', 'G14');
```

## 注意事项

1. **备份数据库**：执行任何SQL文件前，请先备份数据库
2. **幂等性**：`deploy.sql` 使用了 `IF NOT EXISTS`、`ON CONFLICT` 等机制，可以安全地重复执行
3. **依赖关系**：确保基础表结构（subjects、grades、questions等）已存在
4. **年级ID**：所有价格配置都使用动态查询年级的实际ID，确保即使grades表的ID变化也能正常工作
5. **旧版VIP价格**：旧版VIP价格配置会被插入但标记为禁用（`is_active = FALSE`），保留历史记录

## 故障排查

如果遇到错误：

1. **外键约束错误**：确保基础表（subjects、grades、questions等）已存在
2. **函数不存在错误**：`deploy.sql` 会自动创建 `update_updated_at_column()` 函数
3. **表已存在错误**：使用 `CREATE TABLE IF NOT EXISTS`，不会报错
4. **重复键错误**：使用 `ON CONFLICT`，不会报错

## 更新现有数据库

如果数据库已经存在，执行 `deploy.sql` 会：
- 跳过已存在的表（使用 `IF NOT EXISTS`）
- 更新价格配置（使用 `ON CONFLICT DO UPDATE`）
- 添加缺失的字段和索引
- 不会删除或修改现有数据
