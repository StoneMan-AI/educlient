import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())

// 重要：微信支付回调需要使用原始XML数据，必须在express.json()之前处理
// 为支付回调路径单独配置express.raw中间件
// 注意：微信支付回调可能使用 text/xml 或 application/xml，需要同时匹配
app.use('/api/vip/payment-callback', express.raw({ 
  type: ['application/xml', 'text/xml'], 
  limit: '10mb' 
}))

// 其他路由使用JSON解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务（用于提供图片）
// 支持通过环境变量配置上传目录，如果没有配置则使用默认路径
const uploadsDir = process.env.UPLOAD_DIR || join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))
console.log(`静态文件服务路径: /uploads -> ${uploadsDir}`)

// 路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import questionRoutes from './routes/question.js'
import vipRoutes from './routes/vip.js'
import gradeRoutes from './routes/grade.js'
import subjectRoutes from './routes/subject.js'
import knowledgePointRoutes from './routes/knowledgePoint.js'
import pricingRoutes from './routes/pricing.js'
import downloadRoutes from './routes/downloads.js'
import debugRoutes from './routes/debug.js'
import { startGenerationWorker } from './utils/generationWorker.js'

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/vip', vipRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/knowledge-points', knowledgePointRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/downloads', downloadRoutes)

// 调试路由（生产环境建议禁用或添加访问限制）
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG === 'true') {
  app.use('/api/debug', debugRoutes)
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器错误'
  })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  })
})

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
  // 启动生成队列Worker
  startGenerationWorker()
})

