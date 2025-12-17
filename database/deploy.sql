-- ============================================================================
-- 完整数据库部署文件
-- 创建时间: 2025-01-XX
-- 说明: 此文件整合了所有数据库表结构、价格配置和迁移操作
--       执行此文件即可完成整个项目的数据库部署
-- ============================================================================

-- ============================================================================
-- 第一部分：创建辅助函数
-- ============================================================================

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 第二部分：创建扩展表结构
-- ============================================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- VIP会员表
CREATE TABLE IF NOT EXISTS vip_memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    grade_ids INTEGER[] NOT NULL, -- 年级ID数组，支持多年级
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('view_answer', 'download', 'vip')),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    payment_method VARCHAR(20) DEFAULT 'wechat',
    wechat_transaction_id VARCHAR(100),
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL, -- 查看答案时关联题目
    grade_ids INTEGER[], -- VIP订单时关联年级
    vip_membership_id INTEGER REFERENCES vip_memberships(id) ON DELETE SET NULL,
    download_record_id INTEGER, -- 下载记录ID（外键稍后添加）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

-- 用户已下载试题记录表
CREATE TABLE IF NOT EXISTS user_downloaded_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 用户收藏试题表（标记重点题目）
CREATE TABLE IF NOT EXISTS user_favorite_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 试题组表
CREATE TABLE IF NOT EXISTS question_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200),
    question_ids INTEGER[] NOT NULL, -- 题目ID数组
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    pdf_file_path VARCHAR(500), -- 试题组PDF路径
    answer_pdf_file_path VARCHAR(500), -- 答案PDF路径
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 未登录用户访问记录表（用于限流）
CREATE TABLE IF NOT EXISTS guest_access_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    question_ids INTEGER[] DEFAULT '{}', -- 已浏览的题目ID
    view_count INTEGER DEFAULT 0,
    last_view_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP -- 限制访问直到该时间
);

-- 用户查看答案记录表
CREATE TABLE IF NOT EXISTS user_answer_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    is_first_view BOOLEAN DEFAULT TRUE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 重置密码验证码表
CREATE TABLE IF NOT EXISTS reset_password_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 下载记录表（PDF路径字段允许为空，支持异步生成）
CREATE TABLE IF NOT EXISTS download_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_ids INTEGER[] NOT NULL,
    is_vip BOOLEAN DEFAULT FALSE,
    question_pdf_path TEXT, -- 允许为空，异步生成后回填
    answer_pdf_path TEXT, -- 允许为空，异步生成后回填
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 生成PDF任务表（异步队列）
CREATE TABLE IF NOT EXISTS generation_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_ids INTEGER[] NOT NULL,
    grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    is_vip BOOLEAN DEFAULT FALSE,
    download_record_id INTEGER REFERENCES download_records(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','timeout','permanent_failed','cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 2,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    output_question_pdf_path TEXT,
    output_answer_pdf_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学习视频表
-- 说明：
-- - 学科/年级/知识点为必填
-- - 状态默认：已发布
-- - 文件存储路径：与试题图片存储路径一致（建议使用 /uploads/... 形式的URL）
-- - 为与“题目管理”页面保持一致，保留题型/难度字段（可为空）
CREATE TABLE IF NOT EXISTS learning_videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    cover_image_url VARCHAR(500), -- 封面图路径（展示图）
    video_url VARCHAR(500),       -- 视频文件路径
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id) ON DELETE RESTRICT,
    question_type_id INTEGER REFERENCES question_types(id) ON DELETE SET NULL,
    difficulty_id INTEGER REFERENCES difficulty_levels(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT '已发布' CHECK (status IN ('未处理', '已标注', '已审核', '已发布')),
    tags TEXT[],
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- ============================================================================
-- 第三部分：创建索引
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_vip_memberships_user ON vip_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_memberships_status ON vip_memberships(status);
CREATE INDEX IF NOT EXISTS idx_vip_memberships_dates ON vip_memberships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_user_downloaded_questions_user ON user_downloaded_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_downloaded_questions_knowledge ON user_downloaded_questions(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_questions_user ON user_favorite_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_user ON question_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_ip ON guest_access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_answer_views_user ON user_answer_views(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_password_codes_phone ON reset_password_codes(phone);
CREATE INDEX IF NOT EXISTS idx_reset_password_codes_expires ON reset_password_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_download_records_user ON download_records(user_id);
CREATE INDEX IF NOT EXISTS idx_download_records_expires ON download_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user ON generation_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_videos_subject ON learning_videos(subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_videos_grade ON learning_videos(grade_id);
CREATE INDEX IF NOT EXISTS idx_learning_videos_knowledge_point ON learning_videos(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_learning_videos_status ON learning_videos(status);
CREATE INDEX IF NOT EXISTS idx_learning_videos_created_at ON learning_videos(created_at);

-- ============================================================================
-- 第四部分：创建触发器
-- ============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vip_memberships_updated_at BEFORE UPDATE ON vip_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 第五部分：添加外键约束（延迟添加，避免循环依赖）
-- ============================================================================

-- 添加orders表的download_record_id外键（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_download_record_id_fkey'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_download_record_id_fkey 
            FOREIGN KEY (download_record_id) REFERENCES download_records(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 第六部分：创建价格配置表
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL UNIQUE, -- 配置键，如 'vip_grade_1', 'answer_first_view', 'download'
    config_type VARCHAR(20) NOT NULL CHECK (config_type IN ('vip', 'answer', 'download')), -- 配置类型
    grade_id INTEGER REFERENCES grades(id) ON DELETE CASCADE, -- VIP价格关联年级（可为NULL）
    grade_ids INTEGER[], -- 组合套餐的年级ID数组（可为NULL）
    amount DECIMAL(10, 2) NOT NULL, -- 价格（元）
    duration_months INTEGER DEFAULT 1 CHECK (duration_months IN (1, 3, 6)), -- VIP套餐时长（月）
    description TEXT, -- 描述
    is_active BOOLEAN DEFAULT TRUE, -- 是否启用
    is_test_mode BOOLEAN DEFAULT FALSE, -- 是否为测试模式价格
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建价格配置表索引
CREATE INDEX IF NOT EXISTS idx_pricing_config_type ON pricing_config(config_type);
CREATE INDEX IF NOT EXISTS idx_pricing_config_grade ON pricing_config(grade_id);
CREATE INDEX IF NOT EXISTS idx_pricing_config_active ON pricing_config(is_active, is_test_mode);
CREATE INDEX IF NOT EXISTS idx_pricing_config_duration ON pricing_config(duration_months);

-- 创建价格配置表更新时间触发器
CREATE TRIGGER update_pricing_config_updated_at BEFORE UPDATE ON pricing_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 第七部分：添加中考（G13）和高考（G14）年级
-- ============================================================================

DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  -- 插入中考年级（G13），如果不存在
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G13') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('中考', 'G13', 13) RETURNING id INTO g13_id;
    RAISE NOTICE '已添加中考年级（G13），ID: %', g13_id;
  ELSE
    SELECT id INTO g13_id FROM grades WHERE code = 'G13';
    RAISE NOTICE '中考年级（G13）已存在，ID: %', g13_id;
  END IF;
  
  -- 插入高考年级（G14），如果不存在
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G14') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('高考', 'G14', 14) RETURNING id INTO g14_id;
    RAISE NOTICE '已添加高考年级（G14），ID: %', g14_id;
  ELSE
    SELECT id INTO g14_id FROM grades WHERE code = 'G14';
    RAISE NOTICE '高考年级（G14）已存在，ID: %', g14_id;
  END IF;
END $$;

-- ============================================================================
-- 第八部分：插入价格配置
-- ============================================================================

-- 插入查看答案价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('answer_first_view', 'answer', 0.10, '首次查看答案价格', FALSE),
('answer_normal', 'answer', 0.50, '后续查看答案价格', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 插入下载价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download_first', 'download', 1.00, '首次下载试题组价格（体验价）', FALSE),
('download_normal', 'download', 3.00, '后续下载试题组价格', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 插入查看答案价格（测试环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('answer_first_view_test', 'answer', 0.01, '首次查看答案价格（测试）', TRUE),
('answer_normal_test', 'answer', 0.02, '后续查看答案价格（测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 插入下载价格（测试环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download_first_test', 'download', 0.01, '首次下载试题组价格（测试）', TRUE),
('download_normal_test', 'download', 0.01, '后续下载试题组价格（测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 插入旧版VIP价格配置（正式环境，将被禁用）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode, is_active) VALUES
('vip_grade_1', 'vip', 1, 60.00, 1, '小学一年级VIP月费', FALSE, FALSE),
('vip_grade_2', 'vip', 2, 60.00, 1, '小学二年级VIP月费', FALSE, FALSE),
('vip_grade_3', 'vip', 3, 60.00, 1, '小学三年级VIP月费', FALSE, FALSE),
('vip_grade_4', 'vip', 4, 60.00, 1, '小学四年级VIP月费', FALSE, FALSE),
('vip_grade_5', 'vip', 5, 80.00, 1, '小学五年级VIP月费', FALSE, FALSE),
('vip_grade_6', 'vip', 6, 80.00, 1, '小学六年级VIP月费', FALSE, FALSE),
('vip_grade_7', 'vip', 7, 80.00, 1, '初中一年级VIP月费', FALSE, FALSE),
('vip_grade_8', 'vip', 8, 80.00, 1, '初中二年级VIP月费', FALSE, FALSE),
('vip_grade_9', 'vip', 9, 100.00, 1, '初中三年级VIP月费', FALSE, FALSE),
('vip_grade_10', 'vip', 10, 100.00, 1, '高中一年级VIP月费', FALSE, FALSE),
('vip_grade_11', 'vip', 11, 100.00, 1, '高中二年级VIP月费', FALSE, FALSE),
('vip_grade_12', 'vip', 12, 100.00, 1, '高中三年级VIP月费', FALSE, FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  is_active = FALSE,
  duration_months = 1;

-- 插入旧版VIP组合套餐（正式环境，将被禁用）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  
  IF g7_id IS NOT NULL AND g8_id IS NOT NULL AND g9_id IS NOT NULL THEN
    INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode, is_active) VALUES
    ('vip_combo_789', 'vip', ARRAY[g7_id, g8_id, g9_id], 150.00, 1, '7-8-9年级组合VIP月费', FALSE, FALSE)
    ON CONFLICT (config_key) DO UPDATE SET 
      is_active = FALSE,
      duration_months = 1;
  END IF;
  
  IF g10_id IS NOT NULL AND g11_id IS NOT NULL AND g12_id IS NOT NULL THEN
    INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode, is_active) VALUES
    ('vip_combo_101112', 'vip', ARRAY[g10_id, g11_id, g12_id], 150.00, 1, '10-11-12年级组合VIP月费', FALSE, FALSE)
    ON CONFLICT (config_key) DO UPDATE SET 
      is_active = FALSE,
      duration_months = 1;
  END IF;
END $$;

-- 插入旧版VIP价格配置（测试环境，将被禁用）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode, is_active) VALUES
('vip_grade_1_test', 'vip', 1, 0.01, 1, '小学一年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_2_test', 'vip', 2, 0.01, 1, '小学二年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_3_test', 'vip', 3, 0.01, 1, '小学三年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_4_test', 'vip', 4, 0.01, 1, '小学四年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_5_test', 'vip', 5, 0.01, 1, '小学五年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_6_test', 'vip', 6, 0.01, 1, '小学六年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_7_test', 'vip', 7, 0.01, 1, '初中一年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_8_test', 'vip', 8, 0.01, 1, '初中二年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_9_test', 'vip', 9, 0.01, 1, '初中三年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_10_test', 'vip', 10, 0.01, 1, '高中一年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_11_test', 'vip', 11, 0.01, 1, '高中二年级VIP月费（测试）', TRUE, FALSE),
('vip_grade_12_test', 'vip', 12, 0.01, 1, '高中三年级VIP月费（测试）', TRUE, FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  is_active = FALSE,
  duration_months = 1;

-- 插入旧版VIP组合套餐（测试环境，将被禁用）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  
  IF g7_id IS NOT NULL AND g8_id IS NOT NULL AND g9_id IS NOT NULL THEN
    INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode, is_active) VALUES
    ('vip_combo_789_test', 'vip', ARRAY[g7_id, g8_id, g9_id], 0.02, 1, '7-8-9年级组合VIP月费（测试）', TRUE, FALSE)
    ON CONFLICT (config_key) DO UPDATE SET 
      is_active = FALSE,
      duration_months = 1;
  END IF;
  
  IF g10_id IS NOT NULL AND g11_id IS NOT NULL AND g12_id IS NOT NULL THEN
    INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode, is_active) VALUES
    ('vip_combo_101112_test', 'vip', ARRAY[g10_id, g11_id, g12_id], 0.02, 1, '10-11-12年级组合VIP月费（测试）', TRUE, FALSE)
    ON CONFLICT (config_key) DO UPDATE SET 
      is_active = FALSE,
      duration_months = 1;
  END IF;
END $$;

-- ============================================================================
-- 第九部分：插入新的VIP价格配置（1个月、3个月和6个月套餐）
-- ============================================================================

-- 1个月套餐价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_1m', 'vip', 1, 8.00, 1, '小学一年级VIP（1个月套餐）', FALSE),
('vip_grade_2_1m', 'vip', 2, 8.00, 1, '小学二年级VIP（1个月套餐）', FALSE),
('vip_grade_3_1m', 'vip', 3, 8.00, 1, '小学三年级VIP（1个月套餐）', FALSE),
('vip_grade_4_1m', 'vip', 4, 10.00, 1, '小学四年级VIP（1个月套餐）', FALSE),
('vip_grade_5_1m', 'vip', 5, 10.00, 1, '小学五年级VIP（1个月套餐）', FALSE),
('vip_grade_6_1m', 'vip', 6, 10.00, 1, '小学六年级VIP（1个月套餐）', FALSE),
('vip_grade_7_1m', 'vip', 7, 12.00, 1, '初中一年级VIP（1个月套餐）', FALSE),
('vip_grade_8_1m', 'vip', 8, 12.00, 1, '初中二年级VIP（1个月套餐）', FALSE),
('vip_grade_9_1m', 'vip', 9, 12.00, 1, '初中三年级VIP（1个月套餐）', FALSE),
('vip_grade_10_1m', 'vip', 10, 12.00, 1, '高中一年级VIP（1个月套餐）', FALSE),
('vip_grade_11_1m', 'vip', 11, 12.00, 1, '高中二年级VIP（1个月套餐）', FALSE),
('vip_grade_12_1m', 'vip', 12, 12.00, 1, '高中三年级VIP（1个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合：18元（使用G7、G8、G9的实际ID）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_1m', 'vip', ARRAY[g7_id, g8_id, g9_id], 18.00, 1, '初中三年组合VIP（1个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合：18元（使用G10、G11、G12的实际ID）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_1m', 'vip', ARRAY[g10_id, g11_id, g12_id], 18.00, 1, '高中三年组合VIP（1个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP：15元（使用G13的实际ID）
DO $$
DECLARE
  g13_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  IF g13_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13（中考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_1m', 'vip', g13_id, 15.00, 1, '中考VIP（1个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高考VIP：30元（使用G14的实际ID）
DO $$
DECLARE
  g14_id INTEGER;
BEGIN
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G14（高考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_14_1m', 'vip', g14_id, 30.00, 1, '高考VIP（1个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 3个月套餐价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_3m', 'vip', 1, 15.00, 3, '小学一年级VIP（3个月套餐）', FALSE),
('vip_grade_2_3m', 'vip', 2, 15.00, 3, '小学二年级VIP（3个月套餐）', FALSE),
('vip_grade_3_3m', 'vip', 3, 15.00, 3, '小学三年级VIP（3个月套餐）', FALSE),
('vip_grade_4_3m', 'vip', 4, 19.00, 3, '小学四年级VIP（3个月套餐）', FALSE),
('vip_grade_5_3m', 'vip', 5, 19.00, 3, '小学五年级VIP（3个月套餐）', FALSE),
('vip_grade_6_3m', 'vip', 6, 19.00, 3, '小学六年级VIP（3个月套餐）', FALSE),
('vip_grade_7_3m', 'vip', 7, 25.00, 3, '初中一年级VIP（3个月套餐）', FALSE),
('vip_grade_8_3m', 'vip', 8, 25.00, 3, '初中二年级VIP（3个月套餐）', FALSE),
('vip_grade_9_3m', 'vip', 9, 25.00, 3, '初中三年级VIP（3个月套餐）', FALSE),
('vip_grade_10_3m', 'vip', 10, 25.00, 3, '高中一年级VIP（3个月套餐）', FALSE),
('vip_grade_11_3m', 'vip', 11, 25.00, 3, '高中二年级VIP（3个月套餐）', FALSE),
('vip_grade_12_3m', 'vip', 12, 25.00, 3, '高中三年级VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合：39元（使用G7、G8、G9的实际ID）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_3m', 'vip', ARRAY[g7_id, g8_id, g9_id], 39.00, 3, '初中三年组合VIP（3个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合：39元（使用G10、G11、G12的实际ID）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_3m', 'vip', ARRAY[g10_id, g11_id, g12_id], 39.00, 3, '高中三年组合VIP（3个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP：30元（使用G13的实际ID）
DO $$
DECLARE
  g13_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  IF g13_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13（中考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_3m', 'vip', g13_id, 30.00, 3, '中考VIP（3个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高考VIP：60元（使用G14的实际ID）
DO $$
DECLARE
  g14_id INTEGER;
BEGIN
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G14（高考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_14_3m', 'vip', g14_id, 60.00, 3, '高考VIP（3个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 6个月套餐价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_6m', 'vip', 1, 25.00, 6, '小学一年级VIP（6个月套餐）', FALSE),
('vip_grade_2_6m', 'vip', 2, 25.00, 6, '小学二年级VIP（6个月套餐）', FALSE),
('vip_grade_3_6m', 'vip', 3, 25.00, 6, '小学三年级VIP（6个月套餐）', FALSE),
('vip_grade_4_6m', 'vip', 4, 36.00, 6, '小学四年级VIP（6个月套餐）', FALSE),
('vip_grade_5_6m', 'vip', 5, 36.00, 6, '小学五年级VIP（6个月套餐）', FALSE),
('vip_grade_6_6m', 'vip', 6, 36.00, 6, '小学六年级VIP（6个月套餐）', FALSE),
('vip_grade_7_6m', 'vip', 7, 45.00, 6, '初中一年级VIP（6个月套餐）', FALSE),
('vip_grade_8_6m', 'vip', 8, 45.00, 6, '初中二年级VIP（6个月套餐）', FALSE),
('vip_grade_9_6m', 'vip', 9, 45.00, 6, '初中三年级VIP（6个月套餐）', FALSE),
('vip_grade_10_6m', 'vip', 10, 45.00, 6, '高中一年级VIP（6个月套餐）', FALSE),
('vip_grade_11_6m', 'vip', 11, 45.00, 6, '高中二年级VIP（6个月套餐）', FALSE),
('vip_grade_12_6m', 'vip', 12, 45.00, 6, '高中三年级VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合：75元（使用G7、G8、G9的实际ID）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_6m', 'vip', ARRAY[g7_id, g8_id, g9_id], 75.00, 6, '初中三年组合VIP（6个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合：75元（使用G10、G11、G12的实际ID）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_6m', 'vip', ARRAY[g10_id, g11_id, g12_id], 75.00, 6, '高中三年组合VIP（6个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP：55元（使用G13的实际ID）
DO $$
DECLARE
  g13_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  IF g13_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13（中考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_6m', 'vip', g13_id, 55.00, 6, '中考VIP（6个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高考VIP：99元（使用G14的实际ID）
DO $$
DECLARE
  g14_id INTEGER;
BEGIN
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G14（高考）年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_14_6m', 'vip', g14_id, 99.00, 6, '高考VIP（6个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 测试环境价格配置（统一0.01元，用于测试）
-- 1个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_1m_test', 'vip', 1, 0.01, 1, '小学一年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_2_1m_test', 'vip', 2, 0.01, 1, '小学二年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_3_1m_test', 'vip', 3, 0.01, 1, '小学三年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_4_1m_test', 'vip', 4, 0.01, 1, '小学四年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_5_1m_test', 'vip', 5, 0.01, 1, '小学五年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_6_1m_test', 'vip', 6, 0.01, 1, '小学六年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_7_1m_test', 'vip', 7, 0.01, 1, '初中一年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_8_1m_test', 'vip', 8, 0.01, 1, '初中二年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_9_1m_test', 'vip', 9, 0.01, 1, '初中三年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_10_1m_test', 'vip', 10, 0.01, 1, '高中一年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_11_1m_test', 'vip', 11, 0.01, 1, '高中二年级VIP（1个月套餐，测试）', TRUE),
('vip_grade_12_1m_test', 'vip', 12, 0.01, 1, '高中三年级VIP（1个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合（测试环境，1个月套餐）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_1m_test', 'vip', ARRAY[g7_id, g8_id, g9_id], 0.01, 1, '初中三年组合VIP（1个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合（测试环境，1个月套餐）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_1m_test', 'vip', ARRAY[g10_id, g11_id, g12_id], 0.01, 1, '高中三年组合VIP（1个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP和高考VIP（测试环境，1个月套餐）
DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g13_id IS NULL OR g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13或G14年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_1m_test', 'vip', g13_id, 0.01, 1, '中考VIP（1个月套餐，测试）', TRUE),
  ('vip_grade_14_1m_test', 'vip', g14_id, 0.01, 1, '高考VIP（1个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 3个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_3m_test', 'vip', 1, 0.01, 3, '小学一年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_2_3m_test', 'vip', 2, 0.01, 3, '小学二年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_3_3m_test', 'vip', 3, 0.01, 3, '小学三年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_4_3m_test', 'vip', 4, 0.01, 3, '小学四年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_5_3m_test', 'vip', 5, 0.01, 3, '小学五年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_6_3m_test', 'vip', 6, 0.01, 3, '小学六年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_7_3m_test', 'vip', 7, 0.01, 3, '初中一年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_8_3m_test', 'vip', 8, 0.01, 3, '初中二年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_9_3m_test', 'vip', 9, 0.01, 3, '初中三年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_10_3m_test', 'vip', 10, 0.01, 3, '高中一年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_11_3m_test', 'vip', 11, 0.01, 3, '高中二年级VIP（3个月套餐，测试）', TRUE),
('vip_grade_12_3m_test', 'vip', 12, 0.01, 3, '高中三年级VIP（3个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合（测试环境，3个月套餐）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_3m_test', 'vip', ARRAY[g7_id, g8_id, g9_id], 0.01, 3, '初中三年组合VIP（3个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合（测试环境，3个月套餐）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_3m_test', 'vip', ARRAY[g10_id, g11_id, g12_id], 0.01, 3, '高中三年组合VIP（3个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP和高考VIP（测试环境，3个月套餐）
DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g13_id IS NULL OR g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13或G14年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_3m_test', 'vip', g13_id, 0.01, 3, '中考VIP（3个月套餐，测试）', TRUE),
  ('vip_grade_14_3m_test', 'vip', g14_id, 0.01, 3, '高考VIP（3个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 6个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_6m_test', 'vip', 1, 0.01, 6, '小学一年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_2_6m_test', 'vip', 2, 0.01, 6, '小学二年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_3_6m_test', 'vip', 3, 0.01, 6, '小学三年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_4_6m_test', 'vip', 4, 0.01, 6, '小学四年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_5_6m_test', 'vip', 5, 0.01, 6, '小学五年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_6_6m_test', 'vip', 6, 0.01, 6, '小学六年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_7_6m_test', 'vip', 7, 0.01, 6, '初中一年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_8_6m_test', 'vip', 8, 0.01, 6, '初中二年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_9_6m_test', 'vip', 9, 0.01, 6, '初中三年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_10_6m_test', 'vip', 10, 0.01, 6, '高中一年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_11_6m_test', 'vip', 11, 0.01, 6, '高中二年级VIP（6个月套餐，测试）', TRUE),
('vip_grade_12_6m_test', 'vip', 12, 0.01, 6, '高中三年级VIP（6个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初中三年组合（测试环境，6个月套餐）
DO $$
DECLARE
  g7_id INTEGER;
  g8_id INTEGER;
  g9_id INTEGER;
BEGIN
  SELECT id INTO g7_id FROM grades WHERE code = 'G7';
  SELECT id INTO g8_id FROM grades WHERE code = 'G8';
  SELECT id INTO g9_id FROM grades WHERE code = 'G9';
  IF g7_id IS NULL OR g8_id IS NULL OR g9_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G7、G8或G9年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_789_6m_test', 'vip', ARRAY[g7_id, g8_id, g9_id], 0.01, 6, '初中三年组合VIP（6个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 高中三年组合（测试环境，6个月套餐）
DO $$
DECLARE
  g10_id INTEGER;
  g11_id INTEGER;
  g12_id INTEGER;
BEGIN
  SELECT id INTO g10_id FROM grades WHERE code = 'G10';
  SELECT id INTO g11_id FROM grades WHERE code = 'G11';
  SELECT id INTO g12_id FROM grades WHERE code = 'G12';
  IF g10_id IS NULL OR g11_id IS NULL OR g12_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G10、G11或G12年级，请先确保这些年级存在';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
  ('vip_combo_101112_6m_test', 'vip', ARRAY[g10_id, g11_id, g12_id], 0.01, 6, '高中三年组合VIP（6个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    grade_ids = EXCLUDED.grade_ids,
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- 中考VIP和高考VIP（测试环境，6个月套餐）
DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g13_id IS NULL OR g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13或G14年级';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_13_6m_test', 'vip', g13_id, 0.01, 6, '中考VIP（6个月套餐，测试）', TRUE),
  ('vip_grade_14_6m_test', 'vip', g14_id, 0.01, 6, '高考VIP（6个月套餐，测试）', TRUE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- ============================================================================
-- 第十部分：创建视图和添加注释
-- ============================================================================

-- 创建视图：用户VIP状态视图
CREATE OR REPLACE VIEW user_vip_status AS
SELECT 
    u.id as user_id,
    u.phone,
    vm.grade_ids,
    vm.start_date,
    vm.end_date,
    vm.status,
    CASE 
        WHEN vm.end_date >= CURRENT_DATE AND vm.status = 'active' THEN TRUE
        ELSE FALSE
    END as is_vip_active
FROM users u
LEFT JOIN vip_memberships vm ON u.id = vm.user_id
WHERE vm.status = 'active' OR vm.id IS NULL;

-- 添加表注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE vip_memberships IS 'VIP会员表，支持多年级';
COMMENT ON TABLE orders IS '订单表，包含查看答案、下载、VIP充值订单';
COMMENT ON TABLE user_downloaded_questions IS '用户已下载试题记录表';
COMMENT ON TABLE user_favorite_questions IS '用户收藏试题表';
COMMENT ON TABLE question_groups IS '试题组表';
COMMENT ON TABLE guest_access_logs IS '未登录用户访问记录表，用于限流';
COMMENT ON TABLE user_answer_views IS '用户查看答案记录表';
COMMENT ON TABLE reset_password_codes IS '重置密码验证码表';
COMMENT ON TABLE download_records IS '下载记录表';
COMMENT ON TABLE generation_jobs IS '生成PDF任务表（异步队列）';
COMMENT ON TABLE pricing_config IS '价格配置表，存储所有价格信息，支持测试/正式环境切换';
COMMENT ON COLUMN pricing_config.duration_months IS 'VIP套餐时长（月），1=旧版月费，3=3个月套餐，6=6个月套餐';

-- ============================================================================
-- 部署完成
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '数据库部署完成！';
END $$;

