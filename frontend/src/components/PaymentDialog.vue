<template>
  <el-dialog
    v-model="dialogVisible"
    :title="paymentTitle"
    width="500px"
    @close="handleClose"
  >
    <div class="payment-content">
      <div class="amount-info">
        <p class="amount-label">支付金额</p>
        <p class="amount-value">¥{{ amount }}</p>
      </div>
      
      <div v-if="qrCodeUrl" class="qr-code-section">
        <p class="qr-tip">请使用微信扫描二维码支付</p>
        <div class="qr-code">
          <img :src="qrCodeUrl" alt="支付二维码" />
        </div>
        <p class="qr-status">{{ paymentStatus }}</p>
      </div>
      
      <div v-else class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在生成支付二维码...</span>
      </div>
      
      <el-divider />
      
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
  }
})

const emit = defineEmits(['update:modelValue', 'paid'])

const router = useRouter()
const qrCodeUrl = ref('')
const paymentStatus = ref('等待支付')
const checkInterval = ref(null)

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
    qrCodeUrl.value = res.qr_code_url
    
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
  emit('update:modelValue', false)
}

const handleUpgradeVip = () => {
  dialogVisible.value = false
  router.push('/vip')
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

.qr-code-section {
  margin: 30px 0;
}

.qr-tip {
  margin-bottom: 20px;
  color: #666;
}

.qr-code {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.qr-code img {
  width: 200px;
  height: 200px;
  border: 1px solid #ddd;
}

.qr-status {
  margin-top: 15px;
  color: #409eff;
  font-weight: bold;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 40px 0;
  color: #666;
}

.vip-option {
  text-align: left;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
}

.vip-option p {
  margin-bottom: 10px;
  font-weight: bold;
}

.vip-option ul {
  margin: 15px 0;
  padding-left: 20px;
  color: #666;
}

.vip-option li {
  margin-bottom: 8px;
}

.vip-option .el-button {
  margin-top: 15px;
}
</style>

