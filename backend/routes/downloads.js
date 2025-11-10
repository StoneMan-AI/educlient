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
    res.download(absolutePath, downloadName)
  } catch (error) {
    next(error)
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
