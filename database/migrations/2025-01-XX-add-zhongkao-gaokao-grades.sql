-- 添加中考和高考作为独立年级
-- 创建时间: 2025-01-XX

-- 插入中考年级（G13）
INSERT INTO grades (name, code, sort_order)
SELECT '中考', 'G13', 13
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G13');

-- 插入高考年级（G14）
INSERT INTO grades (name, code, sort_order)
SELECT '高考', 'G14', 14
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G14');

