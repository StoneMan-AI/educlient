-- ============================================================================
-- 完整数据库迁移文件
-- 创建时间: 2025-01-XX
-- 说明: 此文件整合了所有数据库迁移操作，按正确顺序执行
-- ============================================================================

-- ============================================================================
-- 第一部分：修改download_records表结构
-- ============================================================================
-- 允许下载记录的PDF路径为空，以便异步生成后回填
-- 执行时间: 2025-11-11

ALTER TABLE download_records
    ALTER COLUMN question_pdf_path DROP NOT NULL;

ALTER TABLE download_records
    ALTER COLUMN answer_pdf_path DROP NOT NULL;

-- ============================================================================
-- 第二部分：添加VIP套餐时长字段
-- ============================================================================
-- 添加duration_months字段到pricing_config表，支持3个月和6个月套餐
-- 执行时间: 2025-01-XX

-- 添加duration_months字段
ALTER TABLE pricing_config 
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1 CHECK (duration_months IN (1, 3, 6));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_config_duration ON pricing_config(duration_months);

-- 将现有的VIP价格配置标记为1个月（旧版，后续会禁用）
UPDATE pricing_config 
SET duration_months = 1 
WHERE config_type = 'vip' AND duration_months IS NULL;

-- 禁用旧版VIP价格配置（is_active = FALSE）
UPDATE pricing_config 
SET is_active = FALSE 
WHERE config_type = 'vip' AND duration_months = 1;

-- 添加字段注释
COMMENT ON COLUMN pricing_config.duration_months IS 'VIP套餐时长（月），1=旧版月费，3=3个月套餐，6=6个月套餐';

-- ============================================================================
-- 第三部分：添加中考（G13）和高考（G14）年级
-- ============================================================================
-- 添加中考和高考作为独立年级
-- 执行时间: 2025-01-XX

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
  
  -- 验证：如果G13或G14不存在，抛出异常
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G13') THEN
    RAISE EXCEPTION '错误：无法添加G13（中考）年级，请检查grades表结构';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G14') THEN
    RAISE EXCEPTION '错误：无法添加G14（高考）年级，请检查grades表结构';
  END IF;
END $$;

-- ============================================================================
-- 第四部分：插入新的VIP价格配置（3个月和6个月套餐）
-- ============================================================================
-- 插入所有新的VIP价格配置，包括单年级和组合套餐
-- 执行时间: 2025-01-XX

-- ----------------------------------------------------------------------------
-- 3个月套餐价格（正式环境）
-- ----------------------------------------------------------------------------

-- 小学1-3年级：每个年级15元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_3m', 'vip', 1, 15.00, 3, '小学一年级VIP（3个月套餐）', FALSE),
('vip_grade_2_3m', 'vip', 2, 15.00, 3, '小学二年级VIP（3个月套餐）', FALSE),
('vip_grade_3_3m', 'vip', 3, 15.00, 3, '小学三年级VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 小学4-6年级：每个年级19元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_4_3m', 'vip', 4, 19.00, 3, '小学四年级VIP（3个月套餐）', FALSE),
('vip_grade_5_3m', 'vip', 5, 19.00, 3, '小学五年级VIP（3个月套餐）', FALSE),
('vip_grade_6_3m', 'vip', 6, 19.00, 3, '小学六年级VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初一、初二、初三：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_7_3m', 'vip', 7, 25.00, 3, '初中一年级VIP（3个月套餐）', FALSE),
('vip_grade_8_3m', 'vip', 8, 25.00, 3, '初中二年级VIP（3个月套餐）', FALSE),
('vip_grade_9_3m', 'vip', 9, 25.00, 3, '初中三年级VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高一、高二、高三：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
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
    RAISE EXCEPTION '错误：无法找到G13（中考）年级，请先执行添加年级的SQL';
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
    RAISE EXCEPTION '错误：无法找到G14（高考）年级，请先执行添加年级的SQL';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_14_3m', 'vip', g14_id, 60.00, 3, '高考VIP（3个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- ----------------------------------------------------------------------------
-- 6个月套餐价格（正式环境）
-- ----------------------------------------------------------------------------

-- 小学1-3年级：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_6m', 'vip', 1, 25.00, 6, '小学一年级VIP（6个月套餐）', FALSE),
('vip_grade_2_6m', 'vip', 2, 25.00, 6, '小学二年级VIP（6个月套餐）', FALSE),
('vip_grade_3_6m', 'vip', 3, 25.00, 6, '小学三年级VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 小学4-6年级：每个年级36元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_4_6m', 'vip', 4, 36.00, 6, '小学四年级VIP（6个月套餐）', FALSE),
('vip_grade_5_6m', 'vip', 5, 36.00, 6, '小学五年级VIP（6个月套餐）', FALSE),
('vip_grade_6_6m', 'vip', 6, 36.00, 6, '小学六年级VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 初一、初二、初三：每个年级45元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_7_6m', 'vip', 7, 45.00, 6, '初中一年级VIP（6个月套餐）', FALSE),
('vip_grade_8_6m', 'vip', 8, 45.00, 6, '初中二年级VIP（6个月套餐）', FALSE),
('vip_grade_9_6m', 'vip', 9, 45.00, 6, '初中三年级VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高一、高二、高三：每个年级45元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
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
    RAISE EXCEPTION '错误：无法找到G13（中考）年级，请先执行添加年级的SQL';
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
    RAISE EXCEPTION '错误：无法找到G14（高考）年级，请先执行添加年级的SQL';
  END IF;
  INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
  ('vip_grade_14_6m', 'vip', g14_id, 99.00, 6, '高考VIP（6个月套餐）', FALSE)
  ON CONFLICT (config_key) DO UPDATE SET 
    amount = EXCLUDED.amount,
    duration_months = EXCLUDED.duration_months,
    description = EXCLUDED.description,
    is_active = TRUE;
END $$;

-- ----------------------------------------------------------------------------
-- 测试环境价格配置（统一0.01元，用于测试）
-- ----------------------------------------------------------------------------

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

-- 初中三年组合（测试环境，3个月套餐，使用G7、G8、G9的实际ID）
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

-- 高中三年组合（测试环境，3个月套餐，使用G10、G11、G12的实际ID）
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

-- 中考VIP和高考VIP（测试环境，3个月套餐，使用G13和G14的实际ID）
DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g13_id IS NULL OR g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13或G14年级，请先执行添加年级的SQL';
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

-- 初中三年组合（测试环境，6个月套餐，使用G7、G8、G9的实际ID）
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

-- 高中三年组合（测试环境，6个月套餐，使用G10、G11、G12的实际ID）
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

-- 中考VIP和高考VIP（测试环境，6个月套餐，使用G13和G14的实际ID）
DO $$
DECLARE
  g13_id INTEGER;
  g14_id INTEGER;
BEGIN
  SELECT id INTO g13_id FROM grades WHERE code = 'G13';
  SELECT id INTO g14_id FROM grades WHERE code = 'G14';
  IF g13_id IS NULL OR g14_id IS NULL THEN
    RAISE EXCEPTION '错误：无法找到G13或G14年级，请先执行添加年级的SQL';
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
-- 迁移完成
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '数据库迁移完成！';
END $$;

