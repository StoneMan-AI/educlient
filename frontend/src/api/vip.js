import api from './index'

export const vipApi = {
  // 获取VIP信息
  getVipInfo() {
    return api.get('/vip/info')
  },
  
  // 创建VIP订单
  createVipOrder(data) {
    return api.post('/vip/order', data)
  },
  
  // 获取支付二维码
  getPaymentQrCode(orderNo) {
    return api.get(`/vip/payment-qrcode/${orderNo}`)
  },
  
  // 查询订单状态
  checkOrderStatus(orderNo) {
    return api.get(`/vip/order-status/${orderNo}`)
  },

  // 模拟支付成功（测试）
  mockPay(orderNo) {
    return api.post('/vip/mock-pay', { order_no: orderNo })
  }
}

