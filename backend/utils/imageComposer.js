import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

/**
 * 将多张题图按照单列排版拼接为多页大图（按A4尺寸像素）
 * 返回生成的大图文件绝对路径数组
 */
export async function composeQuestionImagesToPages(imagePaths, options = {}) {
  const {
    dpi = 150, // 150DPI 更稳
    pageWidthPx = 1240, // A4宽度（约150DPI）
    pageHeightPx = 1754, // A4高度
    gapPx = 12, // 行间距
    tempDir = path.resolve(process.cwd(), 'backend', 'downloads', 'temp'),
  } = options

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const pages = []
  let currentY = 0
  let currentPageItems = []

  const measureAndResize = async (imgPath) => {
    const meta = await sharp(imgPath).metadata()
    if (!meta.width || !meta.height) {
      throw new Error(`无法读取图片尺寸: ${imgPath}`)
    }
    // 等比缩放到页面宽度
    const scale = pageWidthPx / meta.width
    const w = Math.round(meta.width * scale)
    const h = Math.round(meta.height * scale)
    const buffer = await sharp(imgPath).resize({ width: pageWidthPx }).toBuffer()
    return { width: w, height: h, buffer }
  }

  for (const img of imagePaths) {
    const { width, height, buffer } = await measureAndResize(img)
    // 是否需要换页
    const neededHeight = (currentPageItems.length === 0 ? 0 : gapPx) + height
    if (currentY + neededHeight > pageHeightPx) {
      // 输出当前页
      if (currentPageItems.length > 0) {
        const pagePath = await flushPage(currentPageItems, pageWidthPx, currentY, tempDir, pages.length)
        pages.push(pagePath)
      }
      // 新页
      currentY = 0
      currentPageItems = []
    }
    // 放入当前页
    const y = currentY + (currentPageItems.length === 0 ? 0 : gapPx)
    currentPageItems.push({ buffer, top: y, left: 0 })
    currentY = y + height
  }

  // 最后一页
  if (currentPageItems.length > 0) {
    const pagePath = await flushPage(currentPageItems, pageWidthPx, currentY, tempDir, pages.length)
    pages.push(pagePath)
  }

  return pages
}

async function flushPage(items, pageWidthPx, usedHeight, tempDir, pageIndex) {
  const pageHeight = usedHeight
  const composites = items.map(it => ({ input: it.buffer, top: it.top, left: it.left }))
  const outPath = path.join(tempDir, `page_${Date.now()}_${pageIndex}.jpg`)
  await sharp({
    create: {
      width: pageWidthPx,
      height: pageHeight,
      channels: 3,
      background: '#ffffff'
    }
  }).composite(composites).jpeg({ quality: 90 }).toFile(outPath)
  return outPath
}

export function cleanupTempFiles(files) {
  for (const f of files) {
    try { fs.unlinkSync(f) } catch {}
  }
}


