/**
 * 微信支付工具类
 * 接入类型：微信支付 Native支付（扫码支付）
 * 
 * 说明：
 * - 这不是服务号API，而是微信支付商户平台的API
 * - 适用于PC网站，生成二维码让用户扫码支付
 * - 服务号API主要用于公众号内的H5支付或JSAPI支付
 */

import crypto from 'crypto'
import axios from 'axios'
import { parseStringPromise } from 'xml2js'

const APPID = process.env.WECHAT_APPID
const MCHID = process.env.WECHAT_MCHID
const KEY = process.env.WECHAT_KEY
const NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || 'https://yourdomain.com/api/vip/payment-callback'

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 生成签名
 */
function generateSign(params) {
  // 过滤空值并排序
  const sortedParams = Object.keys(params)
    .filter(key => params[key] && key !== 'sign')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  // 加上密钥
  const stringSignTemp = `${sortedParams}&key=${KEY}`
  
  // MD5加密并转大写
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

/**
 * 对象转XML
 */
function objectToXml(obj) {
  let xml = '<xml>'
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      xml += `<${key}><![CDATA[${obj[key]}]]></${key}>`
    }
  }
  xml += '</xml>'
  return xml
}

/**
 * 创建Native支付订单（生成支付二维码）
 * @param {Object} params 
 * @param {string} params.out_trade_no - 商户订单号
 * @param {number} params.total_fee - 总金额（分）
 * @param {string} params.body - 商品描述
 * @param {string} params.spbill_create_ip - 终端IP
 * @returns {Promise<{code_url: string}>} 返回二维码链接
 */
export async function createNativeOrder(params) {
  const {
    out_trade_no,
    total_fee,
    body,
    spbill_create_ip
  } = params

  const requestParams = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: generateNonceStr(),
    body: body,
    out_trade_no: out_trade_no,
    total_fee: Math.round(total_fee * 100), // 转换为分
    spbill_create_ip: spbill_create_ip,
    notify_url: NOTIFY_URL,
    trade_type: 'NATIVE', // Native支付类型
    product_id: out_trade_no // 可选，商品ID
  }

  // 生成签名
  requestParams.sign = generateSign(requestParams)

  // 转换为XML
  const xml = objectToXml(requestParams)

  try {
    // 调用微信支付统一下单接口
    const response = await axios.post(
      'https://api.mch.weixin.qq.com/pay/unifiedorder',
      xml,
      {
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    )

    // 解析XML响应
    const result = await parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true
    })

    if (result.xml.return_code === 'SUCCESS' && result.xml.result_code === 'SUCCESS') {
      return {
        success: true,
        code_url: result.xml.code_url, // 二维码链接
        prepay_id: result.xml.prepay_id
      }
    } else {
      throw new Error(result.xml.err_code_des || result.xml.return_msg || '创建订单失败')
    }
  } catch (error) {
    console.error('微信支付创建订单失败:', error)
    throw error
  }
}

/**
 * 查询订单状态
 * @param {string} out_trade_no - 商户订单号
 * @returns {Promise<Object>}
 */
export async function queryOrder(out_trade_no) {
  const requestParams = {
    appid: APPID,
    mch_id: MCHID,
    out_trade_no: out_trade_no,
    nonce_str: generateNonceStr()
  }

  requestParams.sign = generateSign(requestParams)
  const xml = objectToXml(requestParams)

  try {
    const response = await axios.post(
      'https://api.mch.weixin.qq.com/pay/orderquery',
      xml,
      {
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    )

    const result = await parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true
    })

    if (result.xml.return_code === 'SUCCESS' && result.xml.result_code === 'SUCCESS') {
      return {
        success: true,
        trade_state: result.xml.trade_state, // SUCCESS: 支付成功
        transaction_id: result.xml.transaction_id,
        total_fee: result.xml.total_fee
      }
    } else {
      throw new Error(result.xml.err_code_des || result.xml.return_msg || '查询订单失败')
    }
  } catch (error) {
    console.error('查询订单失败:', error)
    throw error
  }
}

/**
 * 验证支付回调签名
 * @param {Object} params - 回调参数
 * @returns {boolean}
 */
export function verifyPaymentCallback(params) {
  const sign = params.sign
  const calculatedSign = generateSign(params)
  return sign === calculatedSign
}

/**
 * 解析支付回调XML
 * @param {string} xml - XML字符串
 * @returns {Promise<Object>}
 */
export async function parseCallbackXml(xml) {
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    ignoreAttrs: true
  })
  return result.xml
}

