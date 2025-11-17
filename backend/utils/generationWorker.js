import path from 'path'
import fs from 'fs'
import pool from '../config/database.js'
import { composeQuestionImagesToPages, cleanupTempFiles } from './imageComposer.js'
import { assemblePdfFromPages } from './pdfAssembler.js'

const RUN_INTERVAL_MS = 5000
const JOB_TIMEOUT_MS = 2 * 60 * 1000 // 2分钟

function maskPhone(phone) {
  if (!phone) return 'user'
  const tail = String(phone).slice(-4)
  return tail || 'user'
}

async function getMetaForNaming(gradeId, subjectId, knowledgePointId) {
  const gradeRes = await pool.query('SELECT code FROM grades WHERE id = $1', [gradeId])
  const subjectRes = await pool.query('SELECT code FROM subjects WHERE id = $1', [subjectId])
  return {
    gradeCode: gradeRes.rows[0]?.code || 'grade',
    subjectCode: subjectRes.rows[0]?.code || 'subject',
    kpId: knowledgePointId || 0
  }
}

async function loadUserPhone(userId) {
  const res = await pool.query('SELECT phone FROM users WHERE id = $1', [userId])
  return res.rows[0]?.phone || ''
}

async function getQuestionImagePaths(questionIds, isAnswer = false) {
  if (!questionIds || questionIds.length === 0) return []
  const fields = isAnswer ? 'answer_image_url' : 'question_image_url'
  const res = await pool.query(
    `SELECT ${fields} AS url FROM questions WHERE id = ANY($1::int[]) ORDER BY array_position($1::int[], id)`,
    [questionIds]
  )
  const base = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'backend', 'src', 'uploads')
  const paths = []
  for (const row of res.rows) {
    if (!row.url) continue
    // row.url 可能为 /uploads/xxx.png 或相对路径
    const rel = row.url.replace(/^\/?uploads\//, '')
    paths.push(path.join(base, rel))
  }
  return paths
}

async function runOneJob(job) {
  const startedAt = new Date()
  await pool.query(
    `UPDATE generation_jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1, updated_at = NOW() WHERE id = $1`,
    [job.id]
  )
  const timer = setTimeout(() => {}, 0) // 保留引用用于清理
  try {
    // 准备命名和目录
    const DOWNLOAD_ROOT = path.join(process.cwd(), 'downloads')
    const phone = await loadUserPhone(job.user_id)
    const masked = maskPhone(phone)
    const meta = await getMetaForNaming(job.grade_id, job.subject_id, job.knowledge_point_id)
    const ts = new Date()
    const tsStr = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}`
    const baseName = `${masked}_${meta.gradeCode}_${meta.subjectCode}_${meta.kpId}_${tsStr}`
    
    // 确定输出目录：如果有download_record_id，使用recordId子目录；否则使用根目录
    let outputDir = DOWNLOAD_ROOT
    let questionRelativePath = null
    let answerRelativePath = null
    
    if (job.download_record_id) {
      // 使用download_records的目录结构：{recordId}/question.pdf
      outputDir = path.join(DOWNLOAD_ROOT, job.download_record_id.toString())
      questionRelativePath = path.join(job.download_record_id.toString(), 'question.pdf')
      if (job.is_vip) {
        answerRelativePath = path.join(job.download_record_id.toString(), 'answer.pdf')
      }
    } else {
      // 如果没有download_record_id，使用自定义文件名（兼容旧逻辑）
      questionRelativePath = `${baseName}.pdf`
      if (job.is_vip) {
        answerRelativePath = `${baseName}_A.pdf`
      }
    }
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 题图 → 大图页 → PDF
    const qPaths = await getQuestionImagePaths(job.question_ids, false)
    const qPages = await composeQuestionImagesToPages(qPaths)
    const questionPdfAbsolutePath = await assemblePdfFromPages(qPages, outputDir, job.download_record_id ? 'question' : baseName)
    cleanupTempFiles(qPages)

    let answerPdfAbsolutePath = null
    if (job.is_vip) {
      const aPaths = await getQuestionImagePaths(job.question_ids, true)
      if (aPaths.length > 0) {
        const aPages = await composeQuestionImagesToPages(aPaths)
        const aBase = job.download_record_id ? 'answer' : `${baseName}_A`
        answerPdfAbsolutePath = await assemblePdfFromPages(aPages, outputDir, aBase)
        cleanupTempFiles(aPages)
      }
    }

    // 回填下载记录与任务（存储相对路径）
    if (job.download_record_id) {
      await pool.query(
        `UPDATE download_records 
         SET question_pdf_path = COALESCE($1, question_pdf_path),
             answer_pdf_path = COALESCE($2, answer_pdf_path),
             updated_at = NOW()
         WHERE id = $3`,
        [questionRelativePath, answerRelativePath, job.download_record_id]
      )
    }
    await pool.query(
      `UPDATE generation_jobs 
       SET status = 'done', finished_at = NOW(), 
           output_question_pdf_path = $1, output_answer_pdf_path = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [questionRelativePath, answerRelativePath, job.id]
    )
  } catch (err) {
    const took = Date.now() - startedAt.getTime()
    const code = took >= JOB_TIMEOUT_MS ? 'timeout' : 'failed'
    const attemptsRes = await pool.query('SELECT attempts, max_attempts FROM generation_jobs WHERE id = $1', [job.id])
    const attempts = attemptsRes.rows[0]?.attempts || 1
    const maxAttempts = attemptsRes.rows[0]?.max_attempts || 2
    const finalStatus = (attempts >= maxAttempts) ? 'permanent_failed' : code
    await pool.query(
      `UPDATE generation_jobs 
       SET status = $1, error_message = $2, finished_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [finalStatus, String(err?.message || err), job.id]
    )
  } finally {
    clearTimeout(timer)
  }
}

async function pickNextJob() {
  const res = await pool.query(
    `SELECT * FROM generation_jobs 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT 1`
  )
  return res.rows[0] || null
}

let running = false
export function startGenerationWorker() {
  setInterval(async () => {
    if (running) return
    running = true
    try {
      const job = await pickNextJob()
      if (!job) return
      const startAt = Date.now()
      const timeout = setTimeout(async () => {
        // 标记超时
        await pool.query(
          `UPDATE generation_jobs SET status = 'timeout', updated_at = NOW() WHERE id = $1 AND status = 'running'`,
          [job.id]
        )
      }, JOB_TIMEOUT_MS + 1000)
      await runOneJob(job)
      clearTimeout(timeout)
    } catch (e) {
      // 全局日志即可
      console.error('生成任务调度失败:', e)
    } finally {
      running = false
    }
  }, RUN_INTERVAL_MS)
}


