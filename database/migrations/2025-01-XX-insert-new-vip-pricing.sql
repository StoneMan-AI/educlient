-- 插入新的VIP价格配置（3个月和6个月套餐）
-- 创建时间: 2025-01-XX

-- 注意：执行此文件前，请先执行 database/migrations/2025-01-XX-add-zhongkao-gaokao-grades.sql
-- 或者确保grades表中已存在G13（中考）和G14（高考）年级

-- 如果grades表中还没有G13和G14，先添加它们（使用DO块确保正确执行）
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

-- 3个月套餐价格（正式环境）
-- 小学1-3年级：每个年级15元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_3m', 'vip', 1, 15.00, 3, '小学一年级VIP（3个月套餐）', FALSE),
('vip_grade_2_3m', 'vip', 2, 15.00, 3, '小学二年级VIP（3个月套餐）', FALSE),
('vip_grade_3_3m', 'vip', 3, 15.00, 3, '小学三年级VIP（3个月套餐）', FALSE);

-- 小学4-6年级：每个年级19元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_4_3m', 'vip', 4, 19.00, 3, '小学四年级VIP（3个月套餐）', FALSE),
('vip_grade_5_3m', 'vip', 5, 19.00, 3, '小学五年级VIP（3个月套餐）', FALSE),
('vip_grade_6_3m', 'vip', 6, 19.00, 3, '小学六年级VIP（3个月套餐）', FALSE);

-- 初一、初二、初三：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_7_3m', 'vip', 7, 25.00, 3, '初中一年级VIP（3个月套餐）', FALSE),
('vip_grade_8_3m', 'vip', 8, 25.00, 3, '初中二年级VIP（3个月套餐）', FALSE),
('vip_grade_9_3m', 'vip', 9, 25.00, 3, '初中三年级VIP（3个月套餐）', FALSE);

-- 高一、高二、高三：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_10_3m', 'vip', 10, 25.00, 3, '高中一年级VIP（3个月套餐）', FALSE),
('vip_grade_11_3m', 'vip', 11, 25.00, 3, '高中二年级VIP（3个月套餐）', FALSE),
('vip_grade_12_3m', 'vip', 12, 25.00, 3, '高中三年级VIP（3个月套餐）', FALSE);

-- 初中三年组合：39元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_789_3m', 'vip', ARRAY[7, 8, 9], 39.00, 3, '初中三年组合VIP（3个月套餐）', FALSE);

-- 高中三年组合：39元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_101112_3m', 'vip', ARRAY[10, 11, 12], 39.00, 3, '高中三年组合VIP（3个月套餐）', FALSE);

-- 中考VIP：30元（grade_id=13）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_13_3m', 'vip', 13, 30.00, 3, '中考VIP（3个月套餐）', FALSE);

-- 高考VIP：60元（grade_id=14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_14_3m', 'vip', 14, 60.00, 3, '高考VIP（3个月套餐）', FALSE);

-- 6个月套餐价格（正式环境）
-- 小学1-3年级：每个年级25元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_1_6m', 'vip', 1, 25.00, 6, '小学一年级VIP（6个月套餐）', FALSE),
('vip_grade_2_6m', 'vip', 2, 25.00, 6, '小学二年级VIP（6个月套餐）', FALSE),
('vip_grade_3_6m', 'vip', 3, 25.00, 6, '小学三年级VIP（6个月套餐）', FALSE);

-- 小学4-6年级：每个年级36元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_4_6m', 'vip', 4, 36.00, 6, '小学四年级VIP（6个月套餐）', FALSE),
('vip_grade_5_6m', 'vip', 5, 36.00, 6, '小学五年级VIP（6个月套餐）', FALSE),
('vip_grade_6_6m', 'vip', 6, 36.00, 6, '小学六年级VIP（6个月套餐）', FALSE);

-- 初一、初二、初三：每个年级45元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_7_6m', 'vip', 7, 45.00, 6, '初中一年级VIP（6个月套餐）', FALSE),
('vip_grade_8_6m', 'vip', 8, 45.00, 6, '初中二年级VIP（6个月套餐）', FALSE),
('vip_grade_9_6m', 'vip', 9, 45.00, 6, '初中三年级VIP（6个月套餐）', FALSE);

-- 高一、高二、高三：每个年级45元
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_10_6m', 'vip', 10, 45.00, 6, '高中一年级VIP（6个月套餐）', FALSE),
('vip_grade_11_6m', 'vip', 11, 45.00, 6, '高中二年级VIP（6个月套餐）', FALSE),
('vip_grade_12_6m', 'vip', 12, 45.00, 6, '高中三年级VIP（6个月套餐）', FALSE);

-- 初中三年组合：75元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_789_6m', 'vip', ARRAY[7, 8, 9], 75.00, 6, '初中三年组合VIP（6个月套餐）', FALSE);

-- 高中三年组合：75元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_101112_6m', 'vip', ARRAY[10, 11, 12], 75.00, 6, '高中三年组合VIP（6个月套餐）', FALSE);

-- 中考VIP：55元（grade_id=13）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_13_6m', 'vip', 13, 55.00, 6, '中考VIP（6个月套餐）', FALSE);

-- 高考VIP：99元（grade_id=14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_14_6m', 'vip', 14, 99.00, 6, '高考VIP（6个月套餐）', FALSE);

-- 测试环境价格配置（统一0.01元，用于测试）
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
('vip_grade_12_3m_test', 'vip', 12, 0.01, 3, '高中三年级VIP（3个月套餐，测试）', TRUE);

INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_789_3m_test', 'vip', ARRAY[7, 8, 9], 0.01, 3, '初中三年组合VIP（3个月套餐，测试）', TRUE),
('vip_combo_101112_3m_test', 'vip', ARRAY[10, 11, 12], 0.01, 3, '高中三年组合VIP（3个月套餐，测试）', TRUE);

-- 中考VIP和高考VIP（测试环境，grade_id=13和14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_13_3m_test', 'vip', 13, 0.01, 3, '中考VIP（3个月套餐，测试）', TRUE),
('vip_grade_14_3m_test', 'vip', 14, 0.01, 3, '高考VIP（3个月套餐，测试）', TRUE);

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
('vip_grade_12_6m_test', 'vip', 12, 0.01, 6, '高中三年级VIP（6个月套餐，测试）', TRUE);

INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_combo_789_6m_test', 'vip', ARRAY[7, 8, 9], 0.01, 6, '初中三年组合VIP（6个月套餐，测试）', TRUE),
('vip_combo_101112_6m_test', 'vip', ARRAY[10, 11, 12], 0.01, 6, '高中三年组合VIP（6个月套餐，测试）', TRUE);

-- 中考VIP和高考VIP（测试环境，grade_id=13和14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) VALUES
('vip_grade_13_6m_test', 'vip', 13, 0.01, 6, '中考VIP（6个月套餐，测试）', TRUE),
('vip_grade_14_6m_test', 'vip', 14, 0.01, 6, '高考VIP（6个月套餐，测试）', TRUE);

