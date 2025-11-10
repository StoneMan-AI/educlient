import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import pool from '../config/database.js'

const DOWNLOAD_ROOT = path.join(process.cwd(), 'downloads')

async function ensureDownloadRoot() {
  try {
    await fsp.mkdir(DOWNLOAD_ROOT, { recursive: true })
  } catch (error) {
    console.error('创建下载目录失败:', error)
    throw error
  }
}

async function removeFileSafe(filePath) {
  if (!filePath) return
  try {
    await fsp.unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('删除文件失败:', filePath, error)
    }
  }
}

async function removeDirectoryIfEmpty(dirPath) {
  try {
    const files = await fsp.readdir(dirPath)
    if (files.length === 0) {
      await fsp.rmdir(dirPath)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('删除目录失败:', dirPath, error)
    }
  }
}

export async function cleanupExpiredDownloads() {
  await ensureDownloadRoot()
  const client = await pool.connect()
  try {
    const expired = await client.query(
      `SELECT id, question_pdf_path, answer_pdf_path
       FROM download_records
       WHERE expires_at <= NOW()`
    )

    if (expired.rows.length > 0) {
      const ids = expired.rows.map(row => row.id)
      for (const row of expired.rows) {
        if (row.question_pdf_path) {
          await removeFileSafe(path.join(DOWNLOAD_ROOT, row.question_pdf_path))
        }
        if (row.answer_pdf_path) {
          await removeFileSafe(path.join(DOWNLOAD_ROOT, row.answer_pdf_path))
        }
        const dir = path.join(DOWNLOAD_ROOT, path.dirname(row.question_pdf_path || row.answer_pdf_path || ''))
        await removeDirectoryIfEmpty(dir)
      }
      await client.query('DELETE FROM download_records WHERE id = ANY($1::int[])', [ids])
    }
  } finally {
    client.release()
  }
}

function buildFileUrl(id, type) {
  return `/api/downloads/file/${id}/${type}`
}

function mapRecordToResponse(record) {
  return {
    id: record.id,
    question_ids: record.question_ids,
    question_count: record.question_ids?.length || 0,
    is_vip: record.is_vip,
    created_at: record.created_at,
    expires_at: record.expires_at,
    question_pdf_url: record.question_pdf_path ? buildFileUrl(record.id, 'question') : null,
    answer_pdf_url: record.answer_pdf_path ? buildFileUrl(record.id, 'answer') : null
  }
}

export async function createDownloadRecord({
  userId,
  questionIds,
  isVip,
  questionPdfBuffer,
  answerPdfBuffer = null
}) {
  await ensureDownloadRoot()
  await cleanupExpiredDownloads()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const insertResult = await client.query(
      `INSERT INTO download_records (user_id, question_ids, is_vip, question_pdf_path, answer_pdf_path, expires_at)
       VALUES ($1, $2, $3, '', '', NOW() + INTERVAL '7 days')
       RETURNING id, created_at, expires_at, question_ids, is_vip`,
      [userId, questionIds, isVip]
    )

    const record = insertResult.rows[0]
    const recordId = record.id.toString()
    const dirPath = path.join(DOWNLOAD_ROOT, recordId)
    await fsp.mkdir(dirPath, { recursive: true })

    const questionRelativePath = path.join(recordId, 'question.pdf')
    const questionAbsolutePath = path.join(DOWNLOAD_ROOT, questionRelativePath)
    await fsp.writeFile(questionAbsolutePath, questionPdfBuffer)

    let answerRelativePath = null
    if (answerPdfBuffer) {
      answerRelativePath = path.join(recordId, 'answer.pdf')
      const answerAbsolutePath = path.join(DOWNLOAD_ROOT, answerRelativePath)
      await fsp.writeFile(answerAbsolutePath, answerPdfBuffer)
    }

    await client.query(
      `UPDATE download_records
       SET question_pdf_path = $1,
           answer_pdf_path = $2
       WHERE id = $3`,
      [questionRelativePath, answerRelativePath, record.id]
    )

    const finalRecord = await client.query(
      `SELECT id, user_id, question_ids, is_vip, question_pdf_path, answer_pdf_path, created_at, expires_at
       FROM download_records
       WHERE id = $1`,
      [record.id]
    )

    await client.query('COMMIT')

    return finalRecord.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getUserDownloads(userId) {
  await cleanupExpiredDownloads()
  const result = await pool.query(
    `SELECT id, question_ids, is_vip, question_pdf_path, answer_pdf_path, created_at, expires_at
     FROM download_records
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )

  return result.rows.map(mapRecordToResponse)
}

export async function getDownloadRecordById(id) {
  const result = await pool.query(
    `SELECT * FROM download_records WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function getDownloadFile({ recordId, type, userId }) {
  await cleanupExpiredDownloads()
  const record = await getDownloadRecordById(recordId)
  if (!record) {
    const error = new Error('下载记录不存在或已过期')
    error.status = 404
    throw error
  }

  if (record.user_id !== userId) {
    const error = new Error('无权访问该下载文件')
    error.status = 403
    throw error
  }

  if (new Date(record.expires_at) <= new Date()) {
    await cleanupExpiredDownloads()
    const error = new Error('下载链接已过期')
    error.status = 410
    throw error
  }

  let relativePath
  let downloadName
  if (type === 'question') {
    relativePath = record.question_pdf_path
    downloadName = '试题组.pdf'
  } else if (type === 'answer') {
    relativePath = record.answer_pdf_path
    downloadName = '答案.pdf'
  } else {
    const error = new Error('文件类型不正确')
    error.status = 400
    throw error
  }

  if (!relativePath) {
    const error = new Error('文件不存在')
    error.status = 404
    throw error
  }

  const absolutePath = path.join(DOWNLOAD_ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    await cleanupExpiredDownloads()
    const error = new Error('文件不存在或已过期')
    error.status = 404
    throw error
  }

  await pool.query(
    `UPDATE download_records SET last_accessed_at = NOW() WHERE id = $1`,
    [recordId]
  )

  return {
    absolutePath,
    downloadName
  }
}

export function mapDownloadRecordToResponse(record) {
  return mapRecordToResponse(record)
}
