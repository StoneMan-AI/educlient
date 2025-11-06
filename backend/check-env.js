/**
 * 环境变量检查脚本
 * 用于调试数据库连接问题
 * 
 * 使用方法：node check-env.js
 */

import dotenv from 'dotenv'

// 加载.env文件
dotenv.config()

console.log('=== 环境变量检查 ===\n')

// 检查DATABASE_URL
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置')
if (process.env.DATABASE_URL) {
  // 解析连接字符串（隐藏密码）
  try {
    const url = new URL(process.env.DATABASE_URL)
    console.log('  协议:', url.protocol)
    console.log('  主机:', url.hostname)
    console.log('  端口:', url.port || '5432')
    console.log('  数据库:', url.pathname.replace('/', ''))
    console.log('  用户:', url.username)
    console.log('  密码:', url.password ? '***已设置***' : '未设置')
    
    // 检查密码是否为空字符串
    if (url.password === '') {
      console.log('  ⚠️  警告：密码为空字符串！')
    }
  } catch (e) {
    console.log('  ⚠️  DATABASE_URL格式错误:', e.message)
  }
}

// 检查其他关键环境变量
console.log('\n其他环境变量:')
console.log('  NODE_ENV:', process.env.NODE_ENV || '未设置')
console.log('  PORT:', process.env.PORT || '未设置')
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置')

console.log('\n=== 检查完成 ===')

