-- 手动添加G13（中考）和G14（高考）年级
-- 如果遇到外键约束错误，请先执行此文件

-- 方法1：如果grades表的code字段有唯一约束，使用ON CONFLICT
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
  -- 检查并插入中考年级（G13）
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G13') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('中考', 'G13', 13);
    RAISE NOTICE '成功添加中考年级（G13）';
  ELSE
    RAISE NOTICE '中考年级（G13）已存在';
  END IF;
  
  -- 检查并插入高考年级（G14）
  IF NOT EXISTS (SELECT 1 FROM grades WHERE code = 'G14') THEN
    INSERT INTO grades (name, code, sort_order) VALUES ('高考', 'G14', 14);
    RAISE NOTICE '成功添加高考年级（G14）';
  ELSE
    RAISE NOTICE '高考年级（G14）已存在';
  END IF;
END $$;

-- 验证插入结果
SELECT '验证结果：' as info;
SELECT id, name, code, sort_order 
FROM grades 
WHERE code IN ('G13', 'G14')
ORDER BY id;

