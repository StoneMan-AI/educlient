/**
 * PM2配置文件
 * 用于生产环境部署
 * 
 * 使用方法：
 * pm2 start ecosystem.config.js
 * pm2 save
 * pm2 startup
 */

module.exports = {
  apps: [{
    name: 'educlient-backend',
    script: './server.js',
    cwd: process.cwd(),
    instances: 2, // 根据CPU核心数调整，或使用 'max' 自动检测
    exec_mode: 'cluster', // 集群模式
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // 优雅重启
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
}

