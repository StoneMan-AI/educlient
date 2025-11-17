import express from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  cleanupExpiredDownloads,
  getUserDownloads,
  getDownloadFile,
  getDownloadRecordById,
  mapDownloadRecordToResponse
} from '../utils/downloadManager.js'

const router = express.Router()

router.get('/', authenticate, async (req, res, next) => {
  try {
    await cleanupExpiredDownloads()
    const downloads = await getUserDownloads(req.user.id)
    res.json({
      success: true,
      downloads
    })
  } catch (error) {
    next(error)
  }
})

router.get('/file/:id/:type', authenticate, async (req, res, next) => {
  try {
    await cleanupExpiredDownloads()
    const { id, type } = req.params
    const { absolutePath, downloadName } = await getDownloadFile({
      recordId: parseInt(id, 10),
      type,
      userId: req.user.id
    })
    
    // 设置下载响应头
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`)
    
    // 使用download方法，如果失败则返回错误
    res.download(absolutePath, downloadName, (err) => {
      if (err) {
        console.error(`[下载] 文件下载失败: ${absolutePath}`, err)
        // 如果文件已开始发送，不要发送错误响应
        if (!res.headersSent) {
          res.status(err.status || 500).json({
            success: false,
            message: err.message || '文件下载失败'
          })
        }
      }
    })
  } catch (error) {
    console.error(`[下载] 下载处理失败:`, error)
    // 确保错误信息正确返回
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || '文件下载失败'
      })
    } else {
      next(error)
    }
  }
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await getDownloadRecordById(parseInt(req.params.id, 10))
    if (!record || record.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: '下载记录不存在'
      })
    }
    res.json({
      success: true,
      download: mapDownloadRecordToResponse(record)
    })
  } catch (error) {
    next(error)
  }
})

export default router
