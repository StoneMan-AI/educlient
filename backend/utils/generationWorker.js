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
    `SELECT id, ${fields} AS url FROM questions WHERE id = ANY($1::int[]) ORDER BY array_position($1::int[], id)`,
    [questionIds]
  )
  const base = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'backend', 'src', 'uploads')
  console.log(`[Worker] 图片基础路径: ${base}, UPLOAD_DIR=${process.env.UPLOAD_DIR || '未设置'}`)
  const paths = []
  for (const row of res.rows) {
    if (!row.url) {
      console.warn(`[Worker] 题目 #${row.id} 没有${isAnswer ? '答案' : '题目'}图片URL`)
      continue
    }
    // row.url 可能为 /uploads/xxx.png 或相对路径
    const rel = row.url.replace(/^\/?uploads\//, '')
    const fullPath = path.join(base, rel)
    paths.push(fullPath)
    console.log(`[Worker] 题目 #${row.id}: ${row.url} -> ${fullPath}`)
  }
  return paths
}

async function runOneJob(job) {
  const startedAt = new Date()
  console.log(`[Worker] 开始处理任务 #${job.id}, download_record_id=${job.download_record_id}, question_ids=${JSON.stringify(job.question_ids)}`)
  await pool.query(
    `UPDATE generation_jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1, updated_at = NOW() WHERE id = $1`,
    [job.id]
  )
  const timer = setTimeout(() => {}, 0) // 保留引用用于清理
  try {
    // 准备命名和目录
    const DOWNLOAD_ROOT = path.join(process.cwd(), 'downloads')
    console.log(`[Worker] PDF存储根目录: ${DOWNLOAD_ROOT}`)
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
    console.log(`[Worker] 开始获取题目图片路径...`)
    const qPaths = await getQuestionImagePaths(job.question_ids, false)
    console.log(`[Worker] 找到 ${qPaths.length} 张题目图片:`, qPaths)
    
    if (qPaths.length === 0) {
      throw new Error(`未找到任何题目图片，question_ids: ${JSON.stringify(job.question_ids)}`)
    }
    
    // 验证图片文件是否存在
    for (const imgPath of qPaths) {
      if (!fs.existsSync(imgPath)) {
        throw new Error(`图片文件不存在: ${imgPath}`)
      }
    }
    
    console.log(`[Worker] 开始合成图片...`)
    const qPages = await composeQuestionImagesToPages(qPaths)
    console.log(`[Worker] 生成了 ${qPages.length} 页大图:`, qPages)
    
    console.log(`[Worker] 开始生成PDF，输出目录: ${outputDir}`)
    const questionPdfAbsolutePath = await assemblePdfFromPages(qPages, outputDir, job.download_record_id ? 'question' : baseName)
    console.log(`[Worker] PDF生成成功: ${questionPdfAbsolutePath}`)
    
    // 验证PDF文件是否存在
    if (!fs.existsSync(questionPdfAbsolutePath)) {
      throw new Error(`PDF文件生成失败，文件不存在: ${questionPdfAbsolutePath}`)
    }
    
    cleanupTempFiles(qPages)

    let answerPdfAbsolutePath = null
    if (job.is_vip) {
      console.log(`[Worker] VIP用户，开始生成答案PDF...`)
      const aPaths = await getQuestionImagePaths(job.question_ids, true)
      console.log(`[Worker] 找到 ${aPaths.length} 张答案图片:`, aPaths)
      if (aPaths.length > 0) {
        // 验证答案图片文件是否存在
        for (const imgPath of aPaths) {
          if (!fs.existsSync(imgPath)) {
            console.warn(`[Worker] 警告：答案图片文件不存在: ${imgPath}`)
          }
        }
        const aPages = await composeQuestionImagesToPages(aPaths)
        console.log(`[Worker] 生成了 ${aPages.length} 页答案大图`)
        const aBase = job.download_record_id ? 'answer' : `${baseName}_A`
        answerPdfAbsolutePath = await assemblePdfFromPages(aPages, outputDir, aBase)
        console.log(`[Worker] 答案PDF生成成功: ${answerPdfAbsolutePath}`)
        
        // 验证答案PDF文件是否存在
        if (!fs.existsSync(answerPdfAbsolutePath)) {
          throw new Error(`答案PDF文件生成失败，文件不存在: ${answerPdfAbsolutePath}`)
        }
        
        cleanupTempFiles(aPages)
      } else {
        console.warn(`[Worker] VIP用户但未找到答案图片`)
      }
    }

    // 回填下载记录与任务（存储相对路径）
    console.log(`[Worker] 更新数据库记录，questionRelativePath=${questionRelativePath}, answerRelativePath=${answerRelativePath}`)
    if (job.download_record_id) {
      await pool.query(
        `UPDATE download_records 
         SET question_pdf_path = COALESCE($1, question_pdf_path),
             answer_pdf_path = COALESCE($2, answer_pdf_path)
         WHERE id = $3`,
        [questionRelativePath, answerRelativePath, job.download_record_id]
      )
      console.log(`[Worker] 已更新 download_records #${job.download_record_id}`)
    }
    await pool.query(
      `UPDATE generation_jobs 
       SET status = 'done', finished_at = NOW(), 
           output_question_pdf_path = $1, output_answer_pdf_path = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [questionRelativePath, answerRelativePath, job.id]
    )
    console.log(`[Worker] 任务 #${job.id} 完成！`)
  } catch (err) {
    const took = Date.now() - startedAt.getTime()
    const code = took >= JOB_TIMEOUT_MS ? 'timeout' : 'failed'
    const attemptsRes = await pool.query('SELECT attempts, max_attempts FROM generation_jobs WHERE id = $1', [job.id])
    const attempts = attemptsRes.rows[0]?.attempts || 1
    const maxAttempts = attemptsRes.rows[0]?.max_attempts || 2
    const finalStatus = (attempts >= maxAttempts) ? 'permanent_failed' : code
    const errorMsg = String(err?.message || err)
    console.error(`[Worker] 任务 #${job.id} 执行失败 (${finalStatus}):`, errorMsg)
    console.error(`[Worker] 错误堆栈:`, err?.stack)
    await pool.query(
      `UPDATE generation_jobs 
       SET status = $1, error_message = $2, finished_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [finalStatus, errorMsg, job.id]
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
  console.log(`[Worker] Generation Worker已启动，每${RUN_INTERVAL_MS/1000}秒检查一次队列`)
  setInterval(async () => {
    if (running) return
    running = true
    try {
      const job = await pickNextJob()
      if (!job) {
        running = false
        return
      }
      const startAt = Date.now()
      const timeout = setTimeout(async () => {
        // 标记超时
        console.error(`[Worker] 任务 #${job.id} 超时（${JOB_TIMEOUT_MS/1000}秒）`)
        await pool.query(
          `UPDATE generation_jobs SET status = 'timeout', updated_at = NOW() WHERE id = $1 AND status = 'running'`,
          [job.id]
        )
      }, JOB_TIMEOUT_MS + 1000)
      await runOneJob(job)
      clearTimeout(timeout)
    } catch (e) {
      // 全局日志即可
      console.error('[Worker] 生成任务调度失败:', e)
      console.error('[Worker] 错误堆栈:', e?.stack)
    } finally {
      running = false
    }
  }, RUN_INTERVAL_MS)
}


