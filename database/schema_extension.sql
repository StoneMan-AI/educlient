-- 试题组合网站数据库扩展表
-- 创建时间: 2025-01-27

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- VIP会员表
CREATE TABLE vip_memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    grade_ids INTEGER[] NOT NULL, -- 年级ID数组，支持多年级
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('view_answer', 'download', 'vip')),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    payment_method VARCHAR(20) DEFAULT 'wechat',
    wechat_transaction_id VARCHAR(100),
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL, -- 查看答案时关联题目
    grade_ids INTEGER[], -- VIP订单时关联年级
    vip_membership_id INTEGER REFERENCES vip_memberships(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

-- 用户已下载试题记录表
CREATE TABLE user_downloaded_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 用户收藏试题表（标记重点题目）
CREATE TABLE user_favorite_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 试题组表
CREATE TABLE question_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200),
    question_ids INTEGER[] NOT NULL, -- 题目ID数组
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    pdf_file_path VARCHAR(500), -- 试题组PDF路径
    answer_pdf_file_path VARCHAR(500), -- 答案PDF路径
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 未登录用户访问记录表（用于限流）
CREATE TABLE guest_access_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    question_ids INTEGER[] DEFAULT '{}', -- 已浏览的题目ID
    view_count INTEGER DEFAULT 0,
    last_view_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP -- 限制访问直到该时间
);

-- 用户查看答案记录表
CREATE TABLE user_answer_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    is_first_view BOOLEAN DEFAULT TRUE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- 重置密码验证码表
CREATE TABLE reset_password_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 下载记录表
CREATE TABLE download_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_ids INTEGER[] NOT NULL,
    is_vip BOOLEAN DEFAULT FALSE,
    question_pdf_path TEXT NOT NULL,
    answer_pdf_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_vip_memberships_user ON vip_memberships(user_id);
CREATE INDEX idx_vip_memberships_status ON vip_memberships(status);
CREATE INDEX idx_vip_memberships_dates ON vip_memberships(start_date, end_date);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_user_downloaded_questions_user ON user_downloaded_questions(user_id);
CREATE INDEX idx_user_downloaded_questions_knowledge ON user_downloaded_questions(knowledge_point_id);
CREATE INDEX idx_user_favorite_questions_user ON user_favorite_questions(user_id);
CREATE INDEX idx_question_groups_user ON question_groups(user_id);
CREATE INDEX idx_guest_access_logs_ip ON guest_access_logs(ip_address);
CREATE INDEX idx_user_answer_views_user ON user_answer_views(user_id);
CREATE INDEX idx_reset_password_codes_phone ON reset_password_codes(phone);
CREATE INDEX idx_reset_password_codes_expires ON reset_password_codes(expires_at);
CREATE INDEX idx_download_records_user ON download_records(user_id);
CREATE INDEX idx_download_records_expires ON download_records(expires_at);

-- 创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vip_memberships_updated_at BEFORE UPDATE ON vip_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS download_record_id INTEGER REFERENCES download_records(id);

-- 创建视图：用户VIP状态视图
CREATE VIEW user_vip_status AS
SELECT 
    u.id as user_id,
    u.phone,
    vm.grade_ids,
    vm.start_date,
    vm.end_date,
    vm.status,
    CASE 
        WHEN vm.end_date >= CURRENT_DATE AND vm.status = 'active' THEN TRUE
        ELSE FALSE
    END as is_vip_active
FROM users u
LEFT JOIN vip_memberships vm ON u.id = vm.user_id
WHERE vm.status = 'active' OR vm.id IS NULL;

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE vip_memberships IS 'VIP会员表，支持多年级';
COMMENT ON TABLE orders IS '订单表，包含查看答案、下载、VIP充值订单';
COMMENT ON TABLE user_downloaded_questions IS '用户已下载试题记录表';
COMMENT ON TABLE user_favorite_questions IS '用户收藏试题表';
COMMENT ON TABLE question_groups IS '试题组表';
COMMENT ON TABLE guest_access_logs IS '未登录用户访问记录表，用于限流';
COMMENT ON TABLE user_answer_views IS '用户查看答案记录表';
COMMENT ON TABLE reset_password_codes IS '重置密码验证码表';

