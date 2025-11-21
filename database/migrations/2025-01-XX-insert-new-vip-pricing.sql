-- 插入新的VIP价格配置（3个月和6个月套餐）
-- 创建时间: 2025-01-XX

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

-- 中考VIP：30元（使用特殊config_key标识，grade_ids为[7,8,9]）
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_zhongkao_3m', 'vip', ARRAY[7, 8, 9], 30.00, 3, '中考VIP（3个月套餐）', FALSE);

-- 高考VIP：60元（使用特殊config_key标识，grade_ids为[10,11,12]）
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_gaokao_3m', 'vip', ARRAY[10, 11, 12], 60.00, 3, '高考VIP（3个月套餐）', FALSE);

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

-- 中考VIP：55元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_zhongkao_6m', 'vip', ARRAY[7, 8, 9], 55.00, 6, '中考VIP（6个月套餐）', FALSE);

-- 高考VIP：99元
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, duration_months, description, is_test_mode) VALUES
('vip_gaokao_6m', 'vip', ARRAY[10, 11, 12], 99.00, 6, '高考VIP（6个月套餐）', FALSE);

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
('vip_combo_101112_3m_test', 'vip', ARRAY[10, 11, 12], 0.01, 3, '高中三年组合VIP（3个月套餐，测试）', TRUE),
('vip_zhongkao_3m_test', 'vip', ARRAY[7, 8, 9], 0.01, 3, '中考VIP（3个月套餐，测试）', TRUE),
('vip_gaokao_3m_test', 'vip', ARRAY[10, 11, 12], 0.01, 3, '高考VIP（3个月套餐，测试）', TRUE);

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
('vip_combo_101112_6m_test', 'vip', ARRAY[10, 11, 12], 0.01, 6, '高中三年组合VIP（6个月套餐，测试）', TRUE),
('vip_zhongkao_6m_test', 'vip', ARRAY[7, 8, 9], 0.01, 6, '中考VIP（6个月套餐，测试）', TRUE),
('vip_gaokao_6m_test', 'vip', ARRAY[10, 11, 12], 0.01, 6, '高考VIP（6个月套餐，测试）', TRUE);

