import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

/**
 * 生成题目编号SVG图片
 * @param {number} number - 题目序号
 * @param {object} options - 样式选项
 * @returns {Buffer} SVG Buffer
 */
function createNumberSVG(number, options = {}) {
  const {
    fontSize = 32,
    fontColor = '#000000',
    backgroundColor = 'rgba(255, 255, 255, 0.9)', // 白色半透明背景
    padding = 8,
    borderRadius = 4
  } = options
  
  // 编号格式：数字 + 英文句号（如：1.）
  const numberText = `${number}.`
  
  // 估算文本宽度（数字 + 句号）
  const textWidth = numberText.length * fontSize * 0.6
  const svgWidth = Math.max(textWidth + padding * 2, fontSize + padding * 2)
  const svgHeight = fontSize + padding * 2
  
  const svg = `
    <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" rx="${borderRadius}" ry="${borderRadius}"/>
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            fill="${fontColor}"
            text-anchor="middle" 
            dominant-baseline="middle">${numberText}</text>
    </svg>
  `
  return Buffer.from(svg)
}

/**
 * 在图片上添加题目编号
 * @param {Buffer} imageBuffer - 图片Buffer
 * @param {number} number - 题目序号
 * @param {object} options - 配置选项
 * @returns {Promise<Buffer>} 添加编号后的图片Buffer
 */
async function addNumberToImage(imageBuffer, number, options = {}) {
  const {
    position = { x: 30, y: 25 },  // 左上角偏移：距离左边30px，距离顶部25px
    numberSize = 32
  } = options
  
  try {
    // 生成编号SVG
    const numberSVG = createNumberSVG(number, { fontSize: numberSize })
    // 将SVG转换为Buffer
    const numberBuffer = await sharp(numberSVG).toBuffer()
    
    // 叠加编号到图片左上角
    const imageWithNumber = await sharp(imageBuffer)
      .composite([{
        input: numberBuffer,
        top: position.y,
        left: position.x
      }])
      .toBuffer()
    
    return imageWithNumber
  } catch (error) {
    console.warn(`[ImageComposer] 添加编号失败，使用原图:`, error.message)
    return imageBuffer // 失败时返回原图
  }
}

/**
 * 将多张题图按照单列排版拼接为多页大图（按A4尺寸像素）
 * 返回生成的大图文件绝对路径数组
 */
export async function composeQuestionImagesToPages(imagePaths, options = {}) {
  const {
    dpi = 150, // 150DPI 更稳
    pageWidthPx = 1240, // A4宽度（约150DPI）
    pageHeightPx = 1754, // A4高度
    gapPx = 20, // 行间距（图片之间的间距）
    tempDir = path.resolve(process.cwd(), 'backend', 'downloads', 'temp'),
    enableNumbering = true, // 是否启用编号
    numberStyle = {
      fontSize: 32, // 字体大小（会根据DPI自动调整）
      position: { x: 30, y: 25 } // 编号位置：距离左边30px，距离顶部25px
    }
  } = options

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const pages = []
  let currentY = 0
  let currentPageItems = []
  let questionNumber = 1 // 题目序号（连续编号）

  // 根据DPI自动调整编号大小
  const baseNumberSize = numberStyle.fontSize || 32
  const numberSize = Math.round(baseNumberSize * (dpi / 150)) // 150DPI基准，其他DPI按比例调整
  const numberPosition = numberStyle.position || { x: 15, y: 15 }

  const measureAndResize = async (imgPath, number) => {
    try {
      const meta = await sharp(imgPath).metadata()
      if (!meta.width || !meta.height) {
        console.warn(`[ImageComposer] 警告：无法读取图片尺寸，跳过: ${imgPath}`)
        return null
      }
      // 等比缩放到页面宽度
      const scale = pageWidthPx / meta.width
      let buffer = await sharp(imgPath).resize({ width: pageWidthPx }).toBuffer()
      
      // 如果启用编号，添加编号
      if (enableNumbering && number !== undefined) {
        buffer = await addNumberToImage(buffer, number, {
          position: numberPosition,
          numberSize: numberSize
        })
      }
      
      // 从处理后的buffer获取实际尺寸（确保准确性）
      const processedMeta = await sharp(buffer).metadata()
      const w = processedMeta.width || Math.round(meta.width * scale)
      const h = processedMeta.height || Math.round(meta.height * scale)
      
      return { width: w, height: h, buffer }
    } catch (error) {
      console.warn(`[ImageComposer] 警告：图片读取失败，跳过: ${imgPath}`, error.message)
      return null
    }
  }

  for (const img of imagePaths) {
    const resized = await measureAndResize(img, enableNumbering ? questionNumber : undefined)
    if (!resized) {
      console.warn(`[ImageComposer] 跳过损坏或无法读取的图片: ${img}`)
      continue
    }
    const { width, height, buffer } = resized
    
    // 如果成功处理，序号递增（连续编号）
    if (enableNumbering) {
      questionNumber++
    }
    
    // 计算当前图片需要的总高度（包括间距）
    const spacingBefore = currentPageItems.length === 0 ? 0 : gapPx
    const totalNeededHeight = spacingBefore + height
    
    // 检查是否需要换页：如果当前页剩余空间不足，则换页
    // 使用严格判断：currentY + totalNeededHeight 必须 <= pageHeightPx
    if (currentY + totalNeededHeight > pageHeightPx) {
      // 如果当前页有内容，先输出当前页
      if (currentPageItems.length > 0) {
        const pagePath = await flushPage(currentPageItems, pageWidthPx, currentY, tempDir, pages.length)
        pages.push(pagePath)
      }
      // 新页：重置位置和项目列表
      currentY = 0
      currentPageItems = []
    }
    
    // 计算当前图片的Y位置（新页第一张图片不需要上间距）
    const y = currentPageItems.length === 0 ? 0 : currentY + gapPx
    
    // 放入当前页
    currentPageItems.push({ buffer, top: y, left: 0, width, height })
    
    // 更新当前页已使用的高度（图片底部位置）
    currentY = y + height
    
    // 调试日志
    console.log(`[ImageComposer] 图片 #${questionNumber - 1}: 高度=${height}px, Y位置=${y}px, 当前页高度=${currentY}px/${pageHeightPx}px`)
  }

  // 最后一页
  if (currentPageItems.length > 0) {
    const pagePath = await flushPage(currentPageItems, pageWidthPx, currentY, tempDir, pages.length)
    pages.push(pagePath)
  }

  if (pages.length === 0) {
    throw new Error('所有图片都无法处理，无法生成PDF页面')
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


