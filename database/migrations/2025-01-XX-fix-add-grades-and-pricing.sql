-- 修复：先添加G13和G14年级，然后插入价格配置
-- 创建时间: 2025-01-XX
-- 这是一个合并的SQL文件，确保执行顺序正确

-- ============================================
-- 第一步：添加G13（中考）和G14（高考）年级
-- ============================================

-- 方法1：使用INSERT ... ON CONFLICT（如果code字段有唯一约束）
-- INSERT INTO grades (name, code, sort_order) 
-- VALUES ('中考', 'G13', 13)
-- ON CONFLICT (code) DO NOTHING;
--
-- INSERT INTO grades (name, code, sort_order) 
-- VALUES ('高考', 'G14', 14)
-- ON CONFLICT (code) DO NOTHING;

-- 方法2：使用DO块（推荐，兼容性更好）
DO $$
BEGIN
  -- 插入中考年级（G13），如果不存在
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G13') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('中考', 'G13', 13);
    RAISE NOTICE '已添加中考年级（G13）';
  ELSE
    RAISE NOTICE '中考年级（G13）已存在，跳过';
  END IF;
  
  -- 插入高考年级（G14），如果不存在
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G14') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('高考', 'G14', 14);
    RAISE NOTICE '已添加高考年级（G14）';
  ELSE
    RAISE NOTICE '高考年级（G14）已存在，跳过';
  END IF;
END $$;

-- ============================================
-- 第二步：验证G13和G14是否已添加
-- ============================================
DO $$
DECLARE
  g13_exists BOOLEAN;
  g14_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM grades WHERE code = 'G13') INTO g13_exists;
  SELECT EXISTS(SELECT 1 FROM grades WHERE code = 'G14') INTO g14_exists;
  
  IF NOT g13_exists THEN
    RAISE EXCEPTION '错误：G13（中考）年级未成功添加，请检查grades表结构';
  END IF;
  
  IF NOT g14_exists THEN
    RAISE EXCEPTION '错误：G14（高考）年级未成功添加，请检查grades表结构';
  END IF;
  
  RAISE NOTICE '验证成功：G13和G14年级已存在';
END $$;

-- ============================================
-- 第三步：插入G13和G14的价格配置
-- ============================================

-- 中考VIP：3个月套餐（grade_id=13）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_13_3m', 'vip', 13, 30.00, 3, '中考VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高考VIP：3个月套餐（grade_id=14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_14_3m', 'vip', 14, 60.00, 3, '高考VIP（3个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 中考VIP：6个月套餐（grade_id=13）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_13_6m', 'vip', 13, 55.00, 6, '中考VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高考VIP：6个月套餐（grade_id=14）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_14_6m', 'vip', 14, 99.00, 6, '高考VIP（6个月套餐）', FALSE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 测试环境价格配置
-- 中考VIP：3个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_13_3m_test', 'vip', 13, 0.01, 3, '中考VIP（3个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高考VIP：3个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_14_3m_test', 'vip', 14, 0.01, 3, '高考VIP（3个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 中考VIP：6个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_13_6m_test', 'vip', 13, 0.01, 6, '中考VIP（6个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 高考VIP：6个月套餐（测试环境）
INSERT INTO pricing_config (config_key, config_type, grade_id, amount, duration_months, description, is_test_mode) 
VALUES ('vip_grade_14_6m_test', 'vip', 14, 0.01, 6, '高考VIP（6个月套餐，测试）', TRUE)
ON CONFLICT (config_key) DO UPDATE SET 
  amount = EXCLUDED.amount,
  duration_months = EXCLUDED.duration_months,
  description = EXCLUDED.description,
  is_active = TRUE;

RAISE NOTICE 'G13和G14的价格配置已成功插入';

