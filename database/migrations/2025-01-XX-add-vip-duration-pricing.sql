-- 添加VIP套餐时长字段，支持3个月和6个月套餐
-- 创建时间: 2025-01-XX

-- 添加duration_months字段到pricing_config表
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

COMMENT ON COLUMN pricing_config.duration_months IS 'VIP套餐时长（月），1=旧版月费，3=3个月套餐，6=6个月套餐';

