<template>
  <el-dialog
    v-model="dialogVisible"
    :title="paymentTitle"
    width="700px"
    @close="handleClose"
  >
    <div class="payment-content">
      <div class="amount-info">
        <p class="amount-label">支付金额</p>
        <p class="amount-value">¥{{ amount }}</p>
      </div>
      
      <div class="payment-main">
        <div v-if="qrCodeUrl" class="qr-code-section">
          <p class="qr-tip">请使用微信扫描二维码支付</p>
          <div class="qr-code">
            <img :src="qrCodeUrl" alt="支付二维码" />
          </div>
          <p class="qr-status">{{ paymentStatus }}</p>
          <div v-if="enableMockPay" class="mock-pay">
            <el-button
              type="success"
              plain
              size="small"
              :loading="isMocking"
              @click="handleMockPay"
            >
              一键支付成功（测试）
            </el-button>
            <span class="mock-tip">仅用于微信未开通时的测试</span>
          </div>
        </div>
        
        <div v-else class="loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在生成支付二维码...</span>
          <div v-if="enableMockPay" class="mock-pay">
            <el-button
              type="success"
              plain
              size="small"
              :loading="isMocking"
              @click="handleMockPay"
            >
              一键支付成功（测试）
            </el-button>
            <span class="mock-tip">仅用于微信未开通时的测试</span>
          </div>
        </div>
        
        <div class="vip-option">
          <p>或升级为VIP，享受更多权益：</p>
          <ul>
            <li>无限查阅试题和答案</li>
            <li>无限制下载试题和答案</li>
            <li>记录已下载试题</li>
            <li>标记重点题目</li>
          </ul>
          <el-button type="primary" @click="handleUpgradeVip">升级VIP</el-button>
        </div>
      </div>
      
      <div v-if="vipTip" class="vip-tip">
        {{ vipTip }}
      </div>
    </div>
    
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { vipApi } from '@/api/vip'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orderNo: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    default: 0
  },
  paymentType: {
    type: String,
    default: 'answer' // 'answer' | 'download' | 'vip'
  },
  vipTip: {
    type: String,
    default: '' // VIP权限提示信息
  }
})

const emit = defineEmits(['update:modelValue', 'paid'])

const router = useRouter()
const qrCodeUrl = ref('')
const paymentStatus = ref('等待支付')
const checkInterval = ref(null)
const isMocking = ref(false)
const enableMockPay = import.meta.env.VITE_ENABLE_PAYMENT_MOCK === 'true'

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const paymentTitle = computed(() => {
  if (props.paymentType === 'answer') return '查看答案'
  if (props.paymentType === 'download') return '下载试题组'
  return 'VIP充值'
})

const loadQrCode = async () => {
  if (!props.orderNo) return
  
  try {
    const res = await vipApi.getPaymentQrCode(props.orderNo)
    const codeUrl = res.qr_code_url
    
    // 将微信支付的code_url转换为二维码图片
    // code_url格式类似：weixin://wxpay/bizpayurl?pr=xxx
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(codeUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      qrCodeUrl.value = qrCodeDataUrl
    } catch (qrError) {
      console.error('生成二维码图片失败:', qrError)
      ElMessage.error('生成二维码图片失败')
      return
    }
    
    // 开始轮询订单状态
    startPolling()
  } catch (error) {
    ElMessage.error('获取支付二维码失败：' + (error.response?.data?.message || error.message))
  }
}

const startPolling = () => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }
  
  checkInterval.value = setInterval(async () => {
    try {
      const res = await vipApi.checkOrderStatus(props.orderNo)
      if (res.status === 'paid') {
        paymentStatus.value = '支付成功'
        clearInterval(checkInterval.value)
        checkInterval.value = null
        setTimeout(() => {
          emit('paid')
          dialogVisible.value = false
        }, 1000)
      } else if (res.status === 'failed' || res.status === 'cancelled') {
        paymentStatus.value = '支付失败或已取消'
        clearInterval(checkInterval.value)
        checkInterval.value = null
      }
    } catch (error) {
      console.error('查询订单状态失败', error)
    }
  }, 2000) // 每2秒查询一次
}

const handleClose = () => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
    checkInterval.value = null
  }
  isMocking.value = false
  emit('update:modelValue', false)
}

const handleUpgradeVip = () => {
  dialogVisible.value = false
  router.push('/vip')
}

const handleMockPay = async () => {
  if (!props.orderNo || isMocking.value) return

  try {
    isMocking.value = true
    await vipApi.mockPay(props.orderNo)
    paymentStatus.value = '支付成功（模拟）'

    if (checkInterval.value) {
      clearInterval(checkInterval.value)
      checkInterval.value = null
    }

    ElMessage.success('已模拟支付成功')
    emit('paid')
    dialogVisible.value = false
  } catch (error) {
    const message = error.response?.data?.message || error.message || '模拟支付失败'
    ElMessage.error('模拟支付失败：' + message)
  } finally {
    isMocking.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val && props.orderNo) {
    qrCodeUrl.value = ''
    paymentStatus.value = '等待支付'
    loadQrCode()
  } else {
    if (checkInterval.value) {
      clearInterval(checkInterval.value)
      checkInterval.value = null
    }
  }
})

onUnmounted(() => {
  if (checkInterval.value) {
    clearInterval(checkInterval.value)
  }
})
</script>

<style scoped>
.payment-content {
  text-align: center;
}

.amount-info {
  margin-bottom: 30px;
}

.amount-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.amount-value {
  font-size: 32px;
  font-weight: bold;
  color: #f56c6c;
}

.payment-main {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  justify-content: center;
  margin-top: 20px;
}

.qr-code-section {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-tip {
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

.qr-code {
  display: flex;
  justify-content: center;
  margin: 0;
}

.qr-code img {
  width: 200px;
  height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.qr-status {
  margin-top: 15px;
  color: #409eff;
  font-weight: bold;
  font-size: 14px;
}

.mock-pay {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.mock-tip {
  font-size: 12px;
  color: #999;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
  flex: 0 0 auto;
}

.vip-option {
  flex: 1;
  text-align: left;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}

.vip-option p {
  margin-bottom: 10px;
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.vip-option ul {
  margin: 15px 0;
  padding-left: 20px;
  color: #666;
  font-size: 13px;
  flex: 1;
}

.vip-option li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.vip-option .el-button {
  margin-top: auto;
  width: 100%;
}

.vip-tip {
  margin-top: 20px;
  padding: 10px;
  text-align: center;
  color: #f56c6c;
  font-size: 12px;
  line-height: 1.5;
}

/* 响应式设计：小屏幕时改为纵向布局 */
@media (max-width: 768px) {
  .payment-main {
    flex-direction: column;
    align-items: center;
  }
  
  .vip-option {
    width: 100%;
    max-width: 300px;
  }
}
</style>

