import express from 'express'
import pool from '../config/database.js'

const router = express.Router()

// 获取学习视频列表（默认仅返回“已发布”）
// 支持过滤：grade_id / subject_id / knowledge_point_id
// 支持分页：limit / offset
router.get('/', async (req, res, next) => {
  try {
    const {
      grade_id,
      subject_id,
      knowledge_point_id,
      status = '已发布',
      limit = 50,
      offset = 0
    } = req.query

    const where = []
    const params = []

    // 默认仅“已发布”（兼容未来管理端传参）
    if (status) {
      params.push(status)
      where.push(`lv.status = $${params.length}`)
    }

    if (grade_id) {
      params.push(parseInt(grade_id))
      where.push(`lv.grade_id = $${params.length}`)
    }
    if (subject_id) {
      params.push(parseInt(subject_id))
      where.push(`lv.subject_id = $${params.length}`)
    }
    if (knowledge_point_id) {
      params.push(parseInt(knowledge_point_id))
      where.push(`lv.knowledge_point_id = $${params.length}`)
    }

    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200)
    const safeOffset = Math.max(parseInt(offset) || 0, 0)

    params.push(safeLimit)
    const limitPlaceholder = `$${params.length}`
    params.push(safeOffset)
    const offsetPlaceholder = `$${params.length}`

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const result = await pool.query(
      `
      SELECT
        lv.id,
        lv.title,
        lv.cover_image_url,
        lv.video_url,
        lv.subject_id,
        lv.grade_id,
        lv.knowledge_point_id,
        lv.question_type_id,
        lv.difficulty_id,
        lv.status,
        lv.tags,
        lv.remarks,
        lv.created_at,
        lv.updated_at,
        s.name AS subject_name,
        g.name AS grade_name,
        kp.name AS knowledge_point_name,
        qt.name AS question_type_name,
        dl.name AS difficulty_name
      FROM learning_videos lv
      INNER JOIN subjects s ON s.id = lv.subject_id
      INNER JOIN grades g ON g.id = lv.grade_id
      INNER JOIN knowledge_points kp ON kp.id = lv.knowledge_point_id
      LEFT JOIN question_types qt ON qt.id = lv.question_type_id
      LEFT JOIN difficulty_levels dl ON dl.id = lv.difficulty_id
      ${whereSql}
      ORDER BY lv.created_at DESC, lv.id DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      params
    )

    res.json({
      success: true,
      videos: result.rows
    })
  } catch (error) {
    next(error)
  }
})

export default router


