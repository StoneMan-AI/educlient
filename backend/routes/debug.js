/**
 * 调试路由 - 用于排查查询问题
 * 注意：生产环境应禁用或限制访问
 */

import express from 'express'
import pool from '../config/database.js'

const router = express.Router()

// 检查题目数据
router.get('/check-questions', async (req, res, next) => {
  try {
    const { grade_id, subject_id, knowledge_point_id } = req.query
    
    if (!grade_id || !subject_id || !knowledge_point_id) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的查询条件'
      })
    }
    
    const gradeId = parseInt(grade_id)
    const subjectId = parseInt(subject_id)
    const knowledgePointId = parseInt(knowledge_point_id)
    
    // 1. 检查题目是否存在（不限制状态）
    const allQuestions = await pool.query(
      `SELECT q.id, q.status, q.grade_id, q.subject_id, q.knowledge_point_id,
              g.name as grade_name,
              s.name as subject_name,
              kp.name as knowledge_point_name
       FROM questions q
       LEFT JOIN grades g ON q.grade_id = g.id
       LEFT JOIN subjects s ON q.subject_id = s.id
       LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
       WHERE q.grade_id = $1 
         AND q.subject_id = $2 
         AND q.knowledge_point_id = $3
       LIMIT 10`,
      [gradeId, subjectId, knowledgePointId]
    )
    
    // 2. 检查已发布的题目
    const publishedQuestions = await pool.query(
      `SELECT COUNT(*) as count
       FROM questions q
       WHERE q.grade_id = $1 
         AND q.subject_id = $2 
         AND q.knowledge_point_id = $3
         AND q.status = '已发布'`,
      [gradeId, subjectId, knowledgePointId]
    )
    
    // 3. 检查知识点是否存在
    const knowledgePoint = await pool.query(
      `SELECT id, name, grade_id, subject_id, is_active
       FROM knowledge_points
       WHERE id = $1`,
      [knowledgePointId]
    )
    
    // 4. 检查所有状态的题目数量
    const statusCount = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM questions
       WHERE grade_id = $1 
         AND subject_id = $2 
         AND knowledge_point_id = $3
       GROUP BY status`,
      [gradeId, subjectId, knowledgePointId]
    )
    
    // 5. 检查是否有任何题目（不限制条件）
    const anyQuestions = await pool.query(
      `SELECT COUNT(*) as count
       FROM questions
       WHERE grade_id = $1 
         AND subject_id = $2 
         AND knowledge_point_id = $3`,
      [gradeId, subjectId, knowledgePointId]
    )
    
    res.json({
      success: true,
      debug_info: {
        查询参数: {
          grade_id: gradeId,
          subject_id: subjectId,
          knowledge_point_id: knowledgePointId
        },
        题目总数: parseInt(anyQuestions.rows[0].count),
        找到的题目数: allQuestions.rows.length,
        已发布题目数: parseInt(publishedQuestions.rows[0].count),
        各状态题目数: statusCount.rows.map(s => ({
          status: s.status,
          count: parseInt(s.count)
        })),
        题目列表: allQuestions.rows.map(q => ({
          id: q.id,
          status: q.status,
          grade: `${q.grade_id} (${q.grade_name})`,
          subject: `${q.subject_id} (${q.subject_name})`,
          knowledge_point: `${q.knowledge_point_id} (${q.knowledge_point_name})`
        })),
        知识点信息: knowledgePoint.rows[0] || null
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router

