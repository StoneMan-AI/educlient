import PDFDocument from 'pdfkit'
import pool from '../config/database.js'

/**
 * 生成试题组PDF
 * @param {number[]} questionIds - 题目ID数组
 * @param {number} userId - 用户ID
 * @param {boolean} includeAnswer - 是否包含答案（VIP用户）
 * @returns {Promise<Buffer>}
 */
export async function generatePDF(questionIds, userId, includeAnswer = false) {
  return new Promise(async (resolve, reject) => {
    try {
      // 查询题目信息
      const result = await pool.query(
        `SELECT q.*, 
                s.name as subject_name,
                g.name as grade_name,
                kp.name as knowledge_point_name,
                dl.name as difficulty_name
         FROM questions q
         LEFT JOIN subjects s ON q.subject_id = s.id
         LEFT JOIN grades g ON q.grade_id = g.id
         LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
         LEFT JOIN difficulty_levels dl ON q.difficulty_id = dl.id
         WHERE q.id = ANY($1::int[])
         ORDER BY array_position($1::int[], q.id)`,
        [questionIds]
      )
      
      const questions = result.rows
      
      if (questions.length === 0) {
        return reject(new Error('未找到题目'))
      }
      
      // 创建PDF文档
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      })
      
      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)
      
      // 添加标题
      doc.fontSize(20)
        .text('专项练习题组', { align: 'center' })
        .moveDown()
      
      doc.fontSize(12)
        .text(`年级：${questions[0].grade_name || '未知'}`, { align: 'left' })
        .text(`学科：${questions[0].subject_name || '未知'}`, { align: 'left' })
        .text(`知识点：${questions[0].knowledge_point_name || '未知'}`, { align: 'left' })
        .text(`题目数量：${questions.length}道`, { align: 'left' })
        .text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'left' })
        .moveDown(2)
      
      // 添加题目
      questions.forEach((question, index) => {
        // 添加题目编号
        doc.fontSize(14)
          .text(`第 ${index + 1} 题`, { underline: true })
          .moveDown(0.5)
        
        doc.fontSize(12)
          .text(`难度：${question.difficulty_name || '未知'}`, { continued: true })
          .text(`  |  `, { continued: true })
          .text(`类型：${question.question_type_name || '未知'}`)
          .moveDown()
        
        // 添加题目图片（如果有）
        if (question.question_image_url) {
          doc.text('题目：')
          doc.moveDown(0.5)
          // 注意：PDFKit需要图片URL或本地路径
          // 这里需要根据实际情况处理图片
          doc.text(`[题目图片：${question.question_image_url}]`, {
            indent: 20,
            fill: false
          })
          doc.moveDown()
        } else if (question.title) {
          doc.text('题目：')
          doc.moveDown(0.5)
          doc.text(question.title, {
            indent: 20,
            fill: true
          })
          doc.moveDown()
        }
        
        // 如果是答案版，添加答案
        if (includeAnswer && question.answer_image_url) {
          doc.text('答案：')
          doc.moveDown(0.5)
          doc.text(`[答案图片：${question.answer_image_url}]`, {
            indent: 20,
            fill: false
          })
          doc.moveDown()
        }
        
        doc.moveDown()
        
        // 添加分页（除了最后一题）
        if (index < questions.length - 1) {
          doc.addPage()
        }
      })
      
      // 结束文档
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成答案PDF（VIP用户专用）
 * @param {number[]} questionIds - 题目ID数组
 * @returns {Promise<Buffer>}
 */
export async function generateAnswerPDF(questionIds) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await pool.query(
        `SELECT q.*, 
                s.name as subject_name,
                g.name as grade_name,
                kp.name as knowledge_point_name
         FROM questions q
         LEFT JOIN subjects s ON q.subject_id = s.id
         LEFT JOIN grades g ON q.grade_id = g.id
         LEFT JOIN knowledge_points kp ON q.knowledge_point_id = kp.id
         WHERE q.id = ANY($1::int[])
         ORDER BY array_position($1::int[], q.id)`,
        [questionIds]
      )
      
      const questions = result.rows
      
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      })
      
      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)
      
      // 添加标题
      doc.fontSize(20)
        .text('专项练习题组 - 答案', { align: 'center' })
        .moveDown()
      
      // 添加答案
      questions.forEach((question, index) => {
        doc.fontSize(14)
          .text(`第 ${index + 1} 题答案`, { underline: true })
          .moveDown(0.5)
        
        if (question.answer_image_url) {
          doc.text(`[答案图片：${question.answer_image_url}]`, {
            indent: 20
          })
        } else {
          doc.text('暂无答案', {
            indent: 20,
            fill: true
          })
        }
        
        doc.moveDown()
        
        if (index < questions.length - 1) {
          doc.addPage()
        }
      })
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

