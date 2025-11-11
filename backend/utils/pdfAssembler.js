import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

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
    const doc = new PDFDocument({ autoFirstPage: false })
    const stream = fs.createWriteStream(outPath)
    doc.pipe(stream)
    for (const img of pageImagePaths) {
      const { width, height } = imageSizeSync(img)
      // 添加页面，尺寸基于图像像素比例近似A4
      doc.addPage({ size: [width, height], margin: 0 })
      doc.image(img, 0, 0, { width, height })
    }
    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
  return outPath
}

function imageSizeSync(imgPath) {
  // pdfkit不提供读取图片尺寸的方法，这里采用同步方式读取buffer交给PDFKit内部解析并用回调模拟
  // 为简单起见，尝试用JPEG尺寸头部解析，若失败则回退固定大小
  try {
    const buffer = fs.readFileSync(imgPath)
    // 简易JPEG尺寸解析
    let i = 2
    while (i < buffer.length) {
      if (buffer[i] !== 0xFF) break
      const marker = buffer[i + 1]
      const length = buffer.readUInt16BE(i + 2)
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buffer.readUInt16BE(i + 5)
        const width = buffer.readUInt16BE(i + 7)
        return { width, height }
      } else {
        i += 2 + length
      }
    }
  } catch {}
  // 兜底使用A4近似尺寸（150DPI）
  return { width: 1240, height: 1754 }
}


