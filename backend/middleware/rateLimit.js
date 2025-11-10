import rateLimit from 'express-rate-limit'

// 未登录用户限流：3分钟内最多3次请求
export const guestQuestionLimit = rateLimit({
  windowMs: 3 * 60 * 1000, // 3分钟
  max: 3, // 最多3次
  skip: (req) => Boolean(req.user),
  keyGenerator: (req) => {
    // 使用IP地址作为限流key
    return req.ip || req.connection.remoteAddress
  },
  message: {
    success: false,
    message: '未登录用户每3分钟只能查看3道题，请登录或注册账号'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// 通用API限流
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
})

