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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务（用于提供图片）
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// 路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import questionRoutes from './routes/question.js'
import vipRoutes from './routes/vip.js'
import gradeRoutes from './routes/grade.js'
import subjectRoutes from './routes/subject.js'
import knowledgePointRoutes from './routes/knowledgePoint.js'

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/vip', vipRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/knowledge-points', knowledgePointRoutes)

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
})

