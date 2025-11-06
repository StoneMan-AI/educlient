import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// 构建数据库连接配置
let dbConfig = {}

if (process.env.DATABASE_URL) {
  // 使用连接字符串
  dbConfig.connectionString = process.env.DATABASE_URL
} else {
  // 从独立的环境变量构建配置
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'edupro_db',
    user: process.env.DB_USER || 'educlient_user',
    password: process.env.DB_PASSWORD || '',
  }
}

// SSL配置（生产环境）
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = { rejectUnauthorized: false }
}

// 验证密码不为空
if (dbConfig.password === undefined || dbConfig.password === null) {
  console.error('数据库密码未配置！请检查环境变量 DATABASE_URL 或 DB_PASSWORD')
}

// 创建连接池
const pool = new Pool(dbConfig)

// 测试连接
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('数据库连接失败:', err.message)
    console.error('请检查数据库配置是否正确')
  } else {
    console.log('数据库连接成功')
  }
})

// 处理连接错误
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err)
})

export default pool

