-- 检查VIP价格配置状态
-- 用于验证迁移是否成功执行

-- 1. 检查grades表中是否有G13和G14
SELECT '检查grades表中的G13和G14:' as check_item;
SELECT id, name, code, sort_order 
FROM grades 
WHERE code IN ('G13', 'G14')
ORDER BY id;

-- 2. 检查pricing_config表是否有duration_months字段
SELECT '检查pricing_config表结构:' as check_item;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pricing_config' 
  AND column_name = 'duration_months';

-- 3. 检查3个月和6个月套餐价格配置数量
SELECT '检查3个月和6个月套餐价格配置数量:' as check_item;
SELECT duration_months, COUNT(*) as count, is_test_mode
FROM pricing_config
WHERE config_type = 'vip' 
  AND duration_months IN (3, 6)
  AND is_active = TRUE
GROUP BY duration_months, is_test_mode
ORDER BY duration_months, is_test_mode;

-- 4. 检查G13和G14的价格配置
SELECT '检查G13（中考）和G14（高考）的价格配置:' as check_item;
SELECT config_key, grade_id, amount, duration_months, description, is_test_mode
FROM pricing_config
WHERE config_type = 'vip'
  AND grade_id IN (13, 14)
  AND is_active = TRUE
ORDER BY grade_id, duration_months, is_test_mode;

-- 5. 检查旧版VIP价格配置是否已禁用
SELECT '检查旧版VIP价格配置状态:' as check_item;
SELECT duration_months, COUNT(*) as count, is_active
FROM pricing_config
WHERE config_type = 'vip'
GROUP BY duration_months, is_active
ORDER BY duration_months, is_active;

