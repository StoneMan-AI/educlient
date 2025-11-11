-- 更新下载价格配置，支持首次体验价格
-- 创建时间: 2025-01-27

-- 删除旧的下载价格配置
DELETE FROM pricing_config WHERE config_key IN ('download', 'download_test');

-- 插入新的下载价格配置（正式环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download_first', 'download', 1.00, '首次下载试题组价格（体验价）', FALSE),
('download_normal', 'download', 3.00, '后续下载试题组价格', FALSE);

-- 插入新的下载价格配置（测试环境）
INSERT INTO pricing_config (config_key, config_type, amount, description, is_test_mode) VALUES
('download_first_test', 'download', 0.01, '首次下载试题组价格（测试）', TRUE),
('download_normal_test', 'download', 0.01, '后续下载试题组价格（测试）', TRUE);

