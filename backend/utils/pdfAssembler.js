import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'

/**
 * A4纸张尺寸（PDF点单位，1点 = 1/72英寸）
 * A4: 210mm × 297mm = 595.276 × 841.890 点（约595 × 842点）
 */
const A4_WIDTH_POINTS = 595.28
const A4_HEIGHT_POINTS = 841.89

/**
 * 将多张页面大图写入到单个PDF（每页一张）
 * 返回PDF绝对路径
 */
export async function assemblePdfFromPages(pageImagePaths, outputDir, outputFilenameBase) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const outPath = path.join(outputDir, `${outputFilenameBase}.pdf`)
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      autoFirstPage: false,
      size: 'A4',  // 使用A4标准尺寸
      margin: 0    // 无边距，图片填满页面
    })
    const stream = fs.createWriteStream(outPath)
    doc.pipe(stream)
    
    // 处理每页图片
    let pageIndex = 0
    const processPage = async () => {
      if (pageIndex >= pageImagePaths.length) {
        doc.end()
        return
      }
      
      const imgPath = pageImagePaths[pageIndex]
      try {
        // 使用sharp读取图片尺寸（更准确）
        const metadata = await sharp(imgPath).metadata()
        const imgWidthPx = metadata.width || 1240
        const imgHeightPx = metadata.height || 1754
        
        // 计算缩放比例，使图片适应A4页面（保持宽高比）
        // 图片宽高比
        const imgAspectRatio = imgWidthPx / imgHeightPx
        // A4宽高比
        const a4AspectRatio = A4_WIDTH_POINTS / A4_HEIGHT_POINTS
        
        let scaledWidth, scaledHeight
        if (imgAspectRatio > a4AspectRatio) {
          // 图片更宽，以宽度为准
          scaledWidth = A4_WIDTH_POINTS
          scaledHeight = A4_WIDTH_POINTS / imgAspectRatio
        } else {
          // 图片更高，以高度为准
          scaledHeight = A4_HEIGHT_POINTS
          scaledWidth = A4_HEIGHT_POINTS * imgAspectRatio
        }
        
        // 计算位置：水平居中，垂直从顶部50px开始
        const x = (A4_WIDTH_POINTS - scaledWidth) / 2
        const y = 50  // 距离页面顶部50px
        
        // 添加A4页面
        doc.addPage()
        
        // 将图片添加到PDF（使用PDF点单位，保持宽高比）
        // PDFKit会自动保持图片宽高比，只需指定width或height即可
        doc.image(imgPath, x, y, { 
          width: scaledWidth, 
          height: scaledHeight
        })
        
        pageIndex++
        // 处理下一页
        await processPage()
      } catch (error) {
        console.error(`[PDFAssembler] 处理第${pageIndex + 1}页失败:`, error.message)
        // 跳过失败的页面，继续处理下一页
        pageIndex++
        await processPage()
      }
    }
    
    processPage().catch(reject)
    
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
  return outPath
}

// 保留旧函数以兼容（已废弃，使用sharp替代）
function imageSizeSync(imgPath) {
  // 兜底使用A4近似尺寸（150DPI）
  return { width: 1240, height: 1754 }
}


