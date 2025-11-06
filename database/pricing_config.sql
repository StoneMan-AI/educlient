-- 价格配置表
-- 创建时间: 2025-01-27

-- 价格配置表
CREATE TABLE pricing_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) NOT NULL UNIQUE, -- 配置键，如 'vip_grade_1', 'answer_first_view', 'download'
    config_type VARCHAR(20) NOT NULL CHECK (config_type IN ('vip', 'answer', 'download')), -- 配置类型
    grade_id INTEGER REFERENCES grades(id) ON DELETE CASCADE, -- VIP价格关联年级（可为NULL）
    grade_ids INTEGER[], -- 组合套餐的年级ID数组（可为NULL）
    amount DECIMAL(10, 2) NOT NULL, -- 价格（元）
    description TEXT, -- 描述
    is_active BOOLEAN DEFAULT TRUE, -- 是否启用
    is_test_mode BOOLEAN DEFAULT FALSE, -- 是否为测试模式价格
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_pricing_config_type ON pricing_config(config_type);
CREATE INDEX idx_pricing_config_grade ON pricing_config(grade_id);
CREATE INDEX idx_pricing_config_active ON pricing_config(is_active, is_test_mode);

-- 创建更新时间触发器
CREATE TRIGGER update_pricing_config_updated_at BEFORE UPDATE ON pricing_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入正式环境价格配置
-- VIP价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, description, is_test_mode) VALUES
('vip_grade_1', 'vip', 1, 60.00, '小学一年级VIP月费', FALSE),
('vip_grade_2', 'vip', 2, 60.00, '小学二年级VIP月费', FALSE),
('vip_grade_3', 'vip', 3, 60.00, '小学三年级VIP月费', FALSE),
('vip_grade_4', 'vip', 4, 60.00, '小学四年级VIP月费', FALSE),
('vip_grade_5', 'vip', 5, 80.00, '小学五年级VIP月费', FALSE),
('vip_grade_6', 'vip', 6, 80.00, '小学六年级VIP月费', FALSE),
('vip_grade_7', 'vip', 7, 80.00, '初中一年级VIP月费', FALSE),
('vip_grade_8', 'vip', 8, 80.00, '初中二年级VIP月费', FALSE),
('vip_grade_9', 'vip', 9, 100.00, '初中三年级VIP月费', FALSE),
('vip_grade_10', 'vip', 10, 100.00, '高中一年级VIP月费', FALSE),
('vip_grade_11', 'vip', 11, 100.00, '高中二年级VIP月费', FALSE),
('vip_grade_12', 'vip', 12, 100.00, '高中三年级VIP月费', FALSE);

-- VIP组合套餐（正式环境）
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, description, is_test_mode) VALUES
('vip_combo_789', 'vip', ARRAY[7, 8, 9], 150.00, '7-8-9年级组合VIP月费', FALSE),
('vip_combo_101112', 'vip', ARRAY[10, 11, 12], 150.00, '10-11-12年级组合VIP月费', FALSE);

-- 查看答案价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('answer_first_view', 'answer', 0.10, '首次查看答案价格', FALSE),
('answer_normal', 'answer', 0.50, '后续查看答案价格', FALSE);

-- 下载价格（正式环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download', 'download', 1.00, '下载试题组价格', FALSE);

-- 插入测试环境价格配置（统一0.01元）
-- VIP价格（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, description, is_test_mode) VALUES
('vip_grade_1_test', 'vip', 1, 0.01, '小学一年级VIP月费（测试）', TRUE),
('vip_grade_2_test', 'vip', 2, 0.01, '小学二年级VIP月费（测试）', TRUE),
('vip_grade_3_test', 'vip', 3, 0.01, '小学三年级VIP月费（测试）', TRUE),
('vip_grade_4_test', 'vip', 4, 0.01, '小学四年级VIP月费（测试）', TRUE),
('vip_grade_5_test', 'vip', 5, 0.01, '小学五年级VIP月费（测试）', TRUE),
('vip_grade_6_test', 'vip', 6, 0.01, '小学六年级VIP月费（测试）', TRUE),
('vip_grade_7_test', 'vip', 7, 0.01, '初中一年级VIP月费（测试）', TRUE),
('vip_grade_8_test', 'vip', 8, 0.01, '初中二年级VIP月费（测试）', TRUE),
('vip_grade_9_test', 'vip', 9, 0.01, '初中三年级VIP月费（测试）', TRUE),
('vip_grade_10_test', 'vip', 10, 0.01, '高中一年级VIP月费（测试）', TRUE),
('vip_grade_11_test', 'vip', 11, 0.01, '高中二年级VIP月费（测试）', TRUE),
('vip_grade_12_test', 'vip', 12, 0.01, '高中三年级VIP月费（测试）', TRUE);

-- VIP组合套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_ids, amount, description, is_test_mode) VALUES
('vip_combo_789_test', 'vip', ARRAY[7, 8, 9], 0.02, '7-8-9年级组合VIP月费（测试）', TRUE),
('vip_combo_101112_test', 'vip', ARRAY[10, 11, 12], 0.02, '10-11-12年级组合VIP月费（测试）', TRUE);

-- 查看答案价格（测试环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('answer_first_view_test', 'answer', 0.01, '首次查看答案价格（测试）', TRUE),
('answer_normal_test', 'answer', 0.02, '后续查看答案价格（测试）', TRUE);

-- 下载价格（测试环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download_test', 'download', 0.01, '下载试题组价格（测试）', TRUE);

COMMENT ON TABLE pricing_config IS '价格配置表，存储所有价格信息，支持测试/正式环境切换';

