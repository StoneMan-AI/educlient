<template>
  <div class="vip-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="$router.push('/')" :icon="ArrowLeft">返回首页</el-button>
          <h2>VIP充值</h2>
        </div>
      </el-header>
      <el-main>
        <el-card>
          <div class="vip-info">
            <h3>VIP会员权益</h3>
            <ul>
              <li>无限查阅对应年级所有学科的试题和答案</li>
              <li>无限制下载对应年级的试题和试题答案</li>
              <li>拥有记录已下载试题的记录，方便后续查看或复习</li>
              <li>拥有标记重点题目的记录，方便后续复习和下载</li>
            </ul>
          </div>
          
          <el-divider />
          
          <div class="grade-selection">
            <h3>选择年级</h3>
            <el-radio-group v-model="selectedGrade" @change="handleGradeChange">
              <el-radio 
                v-for="grade in grades" 
                :key="grade.id" 
                :label="grade.id"
                :value="grade.id"
              >
                {{ grade.name }}
              </el-radio>
            </el-radio-group>
            
            <div v-if="showComboOption" class="combo-option">
              <el-checkbox v-model="useCombo">购买组合套餐</el-checkbox>
              <p class="combo-desc">{{ comboDesc }}</p>
            </div>
          </div>
          
          <el-divider />
          
          <div class="pricing">
            <h3>价格</h3>
            <div class="price-info">
              <span class="price-label">月费：</span>
              <span class="price-value">¥{{ currentPrice }}</span>
            </div>
            <p class="price-desc">购买后立即生效，到期后自动续费</p>
          </div>
          
          <el-divider />
          
          <div class="vip-status" v-if="userStore.vipInfo">
            <h3>当前VIP状态</h3>
            <el-tag v-if="userStore.isVip" type="success">VIP会员</el-tag>
            <el-tag v-else type="info">非VIP</el-tag>
            <div v-if="userStore.vipInfo.grade_ids && userStore.vipInfo.grade_ids.length > 0">
              <p>已拥有年级：</p>
              <el-tag 
                v-for="gid in userStore.vipInfo.grade_ids" 
                :key="gid"
                style="margin-right: 10px;"
              >
                {{ getGradeName(gid) }}
              </el-tag>
            </div>
            <div v-if="userStore.vipInfo.end_date">
              <p>到期时间：{{ userStore.vipInfo.end_date }}</p>
            </div>
          </div>
          
          <el-divider />
          
          <div class="payment-section">
            <el-button type="primary" size="large" @click="handlePurchase" :loading="loading">
              立即购买
            </el-button>
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 支付对话框 -->
    <PaymentDialog
      v-model="paymentDialogVisible"
      :order-no="orderNo"
      :amount="currentPrice"
      payment-type="vip"
      @paid="handlePaymentSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { questionApi } from '@/api/question'
import { vipApi } from '@/api/vip'
import { pricingApi } from '@/api/pricing'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import PaymentDialog from '@/components/PaymentDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const grades = ref([])
const selectedGrade = ref(null)
const useCombo = ref(false)
const loading = ref(false)
const paymentDialogVisible = ref(false)
const orderNo = ref('')

// 价格映射（从后端API获取）
const priceMap = ref({
  combo78: 0,
  combo1012: 0,
  g1: 0, g2: 0, g3: 0, g4: 0,
  g5: 0, g6: 0,
  g7: 0, g8: 0, g9: 0,
  g10: 0, g11: 0, g12: 0
})

// 加载价格配置
const loadPricing = async () => {
  try {
    const res = await pricingApi.getAllPricing()
    if (res.success && res.pricing) {
      priceMap.value = {
        combo78: res.pricing.vip.combo78 || 0,
        combo1012: res.pricing.vip.combo1012 || 0,
        g1: res.pricing.vip.g1 || 0,
        g2: res.pricing.vip.g2 || 0,
        g3: res.pricing.vip.g3 || 0,
        g4: res.pricing.vip.g4 || 0,
        g5: res.pricing.vip.g5 || 0,
        g6: res.pricing.vip.g6 || 0,
        g7: res.pricing.vip.g7 || 0,
        g8: res.pricing.vip.g8 || 0,
        g9: res.pricing.vip.g9 || 0,
        g10: res.pricing.vip.g10 || 0,
        g11: res.pricing.vip.g11 || 0,
        g12: res.pricing.vip.g12 || 0
      }
    }
  } catch (error) {
    console.error('加载价格配置失败:', error)
    ElMessage.error('加载价格配置失败')
  }
}

const showComboOption = computed(() => {
  if (!selectedGrade.value) return false
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return false
  const code = grade.code
  return code === 'G7' || code === 'G8' || code === 'G9' || 
         code === 'G10' || code === 'G11' || code === 'G12'
})

const comboDesc = computed(() => {
  if (!selectedGrade.value) return ''
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return ''
  const code = grade.code
  const pricing = priceMap.value
  if (code === 'G7' || code === 'G8' || code === 'G9') {
    return `同时购买7、8、9年级，每月${pricing.combo78}元`
  }
  if (code === 'G10' || code === 'G11' || code === 'G12') {
    return `同时购买10、11、12年级，每月${pricing.combo1012}元`
  }
  return ''
})

const currentPrice = computed(() => {
  if (!selectedGrade.value) return 0
  
  const pricing = priceMap.value
  
  if (useCombo.value) {
    const grade = grades.value.find(g => g.id === selectedGrade.value)
    if (!grade) return 0
    const code = grade.code
    if (code === 'G7' || code === 'G8' || code === 'G9') {
      return pricing.combo78
    }
    if (code === 'G10' || code === 'G11' || code === 'G12') {
      return pricing.combo1012
    }
  }
  
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return 0
  const code = grade.code.toLowerCase()
  return pricing[code] || 0
})

const getGradeName = (gradeId) => {
  const grade = grades.value.find(g => g.id === gradeId)
  return grade ? grade.name : ''
}

const handleGradeChange = () => {
  useCombo.value = false
}

const handlePurchase = async () => {
  if (!selectedGrade.value) {
    ElMessage.warning('请选择年级')
    return
  }
  
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  loading.value = true
  try {
    let gradeIds = [selectedGrade.value]
    
    if (useCombo.value) {
      const grade = grades.value.find(g => g.id === selectedGrade.value)
      if (grade) {
        const code = grade.code
        if (code === 'G7' || code === 'G8' || code === 'G9') {
          gradeIds = [7, 8, 9].map(id => grades.value.find(g => {
            const gcode = g.code
            return (gcode === 'G7' && id === 7) || (gcode === 'G8' && id === 8) || (gcode === 'G9' && id === 9)
          })?.id).filter(Boolean)
        } else if (code === 'G10' || code === 'G11' || code === 'G12') {
          gradeIds = [10, 11, 12].map(id => grades.value.find(g => {
            const gcode = g.code
            return (gcode === 'G10' && id === 10) || (gcode === 'G11' && id === 11) || (gcode === 'G12' && id === 12)
          })?.id).filter(Boolean)
        }
      }
    }
    
    const res = await vipApi.createVipOrder({
      grade_ids: gradeIds,
      amount: currentPrice.value
    })
    
    orderNo.value = res.order_no
    paymentDialogVisible.value = true
  } catch (error) {
    ElMessage.error('创建订单失败：' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const handlePaymentSuccess = async () => {
  paymentDialogVisible.value = false
  ElMessage.success('VIP购买成功')
  // 刷新用户信息
  await userStore.fetchUserInfo()
}

onMounted(async () => {
  try {
    // 加载价格配置
    await loadPricing()
    
    const res = await questionApi.getGrades()
    grades.value = res.grades || []
    
    // 如果URL中有grade_id参数，自动选中
    if (route.query.grade_id) {
      const gradeId = parseInt(route.query.grade_id)
      if (grades.value.find(g => g.id === gradeId)) {
        selectedGrade.value = gradeId
      }
    }
  } catch (error) {
    ElMessage.error('获取年级列表失败')
  }
})
</script>

<style scoped>
.vip-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.header-content h2 {
  margin: 0;
}

.vip-info ul {
  margin: 15px 0;
  padding-left: 20px;
  color: #666;
}

.vip-info li {
  margin-bottom: 10px;
}

.grade-selection {
  margin: 20px 0;
}

.grade-selection h3 {
  margin-bottom: 15px;
}

.combo-option {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.combo-desc {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}

.pricing {
  margin: 20px 0;
}

.pricing h3 {
  margin-bottom: 15px;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.price-label {
  font-size: 16px;
  color: #666;
}

.price-value {
  font-size: 32px;
  font-weight: bold;
  color: #f56c6c;
}

.price-desc {
  color: #999;
  font-size: 14px;
}

.vip-status {
  margin: 20px 0;
}

.vip-status h3 {
  margin-bottom: 15px;
}

.vip-status p {
  margin: 10px 0;
  color: #666;
}

.payment-section {
  text-align: center;
  margin-top: 30px;
}
</style>

