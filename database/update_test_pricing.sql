-- 更新测试环境价格配置
-- 执行时间: 2025-01-27

-- 更新年级组合充值金额为0.02
UPDATE pricing_config 
SET amount = 0.02, updated_at = NOW() 
WHERE config_key IN ('vip_combo_789_test', 'vip_combo_101112_test') 
  AND is_test_mode = TRUE;

-- 更新查看答案价格，后续查看改为0.02
UPDATE pricing_config 
SET amount = 0.02, updated_at = NOW() 
WHERE config_key = 'answer_normal_test' 
  AND is_test_mode = TRUE;

-- 验证更新结果
SELECT config_key, config_type, amount, description 
FROM pricing_config 
WHERE is_test_mode = TRUE 
ORDER BY config_type, config_key;

