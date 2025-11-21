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
            
            <!-- 组合套餐选项（仅初中和高中，且不是中考或高考） -->
            <div v-if="showComboOption" class="combo-option">
              <el-checkbox v-model="useCombo" @change="handleComboChange">购买组合套餐</el-checkbox>
            </div>
          </div>
          
          <el-divider />
          
          <!-- 套餐选择（3个月和6个月） -->
          <div v-if="selectedGrade" class="package-selection">
            <h3>选择套餐</h3>
            <div class="package-cards">
              <!-- 3个月套餐 -->
              <div 
                class="package-card" 
                :class="{ 'selected': selectedDuration === 3 }"
                @click="selectedDuration = 3"
              >
                <div class="package-header">
                  <h4>3个月套餐</h4>
                  <el-tag type="success" size="small">推荐</el-tag>
                </div>
                <div class="package-price">
                  <span class="price-value">¥{{ price3m }}</span>
                  <span class="price-unit">/3个月</span>
                </div>
                <div class="package-monthly">
                  <span class="monthly-label">平均每月：</span>
                  <span class="monthly-value">¥{{ monthlyPrice3m }}</span>
                </div>
              </div>
              
              <!-- 6个月套餐 -->
              <div 
                class="package-card" 
                :class="{ 'selected': selectedDuration === 6 }"
                @click="selectedDuration = 6"
              >
                <div class="package-header">
                  <h4>6个月套餐</h4>
                  <el-tag type="warning" size="small">更优惠</el-tag>
                </div>
                <div class="package-price">
                  <span class="price-value">¥{{ price6m }}</span>
                  <span class="price-unit">/6个月</span>
                </div>
                <div class="package-monthly">
                  <span class="monthly-label">平均每月：</span>
                  <span class="monthly-value">¥{{ monthlyPrice6m }}</span>
                </div>
              </div>
            </div>
            <p class="package-desc">购买后立即生效，到期后不会自动扣费</p>
          </div>
          
          <el-divider />
          
          <div class="vip-status" v-if="vipRecords.length > 0">
            <h3>已拥有VIP记录</h3>
            <el-tag v-if="userStore.isVip" type="success" style="margin-bottom: 15px;">VIP会员</el-tag>
            <el-tag v-else type="info" style="margin-bottom: 15px;">非VIP</el-tag>
            
            <el-table
              :data="vipRecords"
              border
              style="margin-top: 15px;"
            >
              <el-table-column prop="grade_ids" label="年级" min-width="200">
                <template #default="scope">
                  <el-tag 
                    v-for="gid in scope.row.grade_ids" 
                    :key="gid"
                    style="margin-right: 8px; margin-bottom: 4px;"
                  >
                    {{ getGradeName(gid) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="start_date" label="开始时间" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.start_date) }}
                </template>
              </el-table-column>
              <el-table-column prop="end_date" label="到期时间" width="120">
                <template #default="scope">
                  <span :class="{ 'expired-text': isExpired(scope.row.end_date) }">
                    {{ formatDate(scope.row.end_date) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="is_vip_active" label="状态" width="100">
                <template #default="scope">
                  <el-tag v-if="scope.row.is_vip_active" type="success">有效</el-tag>
                  <el-tag v-else type="info">已过期</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <div class="vip-status" v-else-if="userStore.isLoggedIn">
            <h3>当前VIP状态</h3>
            <el-tag type="info">非VIP</el-tag>
            <p style="margin-top: 10px; color: #666;">您还没有购买VIP会员</p>
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
import { ref, computed, onMounted, watch } from 'vue'
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
const selectedDuration = ref(3) // 默认选择3个月套餐
const useCombo = ref(false)
const loading = ref(false)
const paymentDialogVisible = ref(false)
const orderNo = ref('')
const vipRecords = ref([])

const priceMap = ref({
  '3m': {}, // 3个月套餐价格
  '6m': {}  // 6个月套餐价格
})

const loadPricing = async () => {
  try {
    const res = await pricingApi.getAllPricing()
    if (res.success && res.pricing && res.pricing.vip) {
      priceMap.value = {
        '3m': res.pricing.vip['3m'] || {},
        '6m': res.pricing.vip['6m'] || {}
      }
    }
  } catch (error) {
    console.error('加载价格配置失败:', error)
    ElMessage.error('加载价格配置失败')
  }
}

// 显示组合套餐选项（仅初中和高中，且不是中考或高考）
const showComboOption = computed(() => {
  if (!selectedGrade.value) return false
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return false
  const code = grade.code
  // 中考（G13）和高考（G14）不显示组合套餐选项
  if (code === 'G13' || code === 'G14') {
    return false
  }
  return code === 'G7' || code === 'G8' || code === 'G9' || 
         code === 'G10' || code === 'G11' || code === 'G12'
})

// 获取当前选择的价格（3个月）
const price3m = computed(() => {
  if (!selectedGrade.value) return 0
  const pricing = priceMap.value['3m'] || {}
  
  if (useCombo.value) {
    const grade = grades.value.find(g => g.id === selectedGrade.value)
    if (!grade) return 0
    const code = grade.code
    if (code === 'G7' || code === 'G8' || code === 'G9') {
      return pricing.combo_7_8_9 || 0
    }
    if (code === 'G10' || code === 'G11' || code === 'G12') {
      return pricing.combo_10_11_12 || 0
    }
  }
  
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return 0
  return pricing[`grade_${grade.id}`] || 0
})

// 获取当前选择的价格（6个月）
const price6m = computed(() => {
  if (!selectedGrade.value) return 0
  const pricing = priceMap.value['6m'] || {}
  
  if (useCombo.value) {
    const grade = grades.value.find(g => g.id === selectedGrade.value)
    if (!grade) return 0
    const code = grade.code
    if (code === 'G7' || code === 'G8' || code === 'G9') {
      return pricing.combo_7_8_9 || 0
    }
    if (code === 'G10' || code === 'G11' || code === 'G12') {
      return pricing.combo_10_11_12 || 0
    }
  }
  
  const grade = grades.value.find(g => g.id === selectedGrade.value)
  if (!grade) return 0
  return pricing[`grade_${grade.id}`] || 0
})

// 每月价格（3个月套餐）
const monthlyPrice3m = computed(() => {
  return (price3m.value / 3).toFixed(2)
})

// 每月价格（6个月套餐）
const monthlyPrice6m = computed(() => {
  return (price6m.value / 6).toFixed(2)
})

// 当前选择的价格
const currentPrice = computed(() => {
  return selectedDuration.value === 6 ? price6m.value : price3m.value
})

const getGradeName = (gradeId) => {
  const grade = grades.value.find(g => g.id === gradeId)
  return grade ? grade.name : ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const pad = (num) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const isExpired = (endDate) => {
  if (!endDate) return false
  const end = new Date(endDate)
  const now = new Date()
  return end < now
}

const loadVipRecords = async () => {
  if (!userStore.isLoggedIn) {
    vipRecords.value = []
    return
  }
  try {
    const res = await vipApi.getVipInfo()
    if (res.success && res.vip_records) {
      vipRecords.value = res.vip_records || []
    } else {
      vipRecords.value = []
    }
  } catch (error) {
    console.error('加载VIP记录失败:', error)
    vipRecords.value = []
  }
}

const handleGradeChange = () => {
  useCombo.value = false
  selectedDuration.value = 3 // 重置为3个月
}

const handleComboChange = () => {
  // 组合套餐切换时无需特殊处理
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
  if (currentPrice.value === 0) {
    ElMessage.warning('价格配置错误，请刷新页面重试')
    return
  }
  
  loading.value = true
  try {
    let gradeIds = [selectedGrade.value]
    
    if (useCombo.value) {
      // 组合套餐
      const grade = grades.value.find(g => g.id === selectedGrade.value)
      if (grade) {
        const code = grade.code
        if (code === 'G7' || code === 'G8' || code === 'G9') {
          gradeIds = [7, 8, 9].map(id => grades.value.find(g => g.code === `G${id}`)?.id).filter(Boolean)
        } else if (code === 'G10' || code === 'G11' || code === 'G12') {
          gradeIds = [10, 11, 12].map(id => grades.value.find(g => g.code === `G${id}`)?.id).filter(Boolean)
        }
      }
    }
    // 如果选择的是中考（G13）或高考（G14），gradeIds就是[13]或[14]，无需特殊处理
    
    const res = await vipApi.createVipOrder({
      grade_ids: gradeIds,
      amount: currentPrice.value,
      duration_months: selectedDuration.value
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
  await userStore.fetchUserInfo()
  await loadVipRecords() // 重新加载VIP记录
}

// 监听用户登录状态变化，自动加载VIP记录
watch(() => userStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    loadVipRecords()
  } else {
    vipRecords.value = []
  }
})

onMounted(async () => {
  try {
    await Promise.all([
      loadPricing(),
      questionApi.getGrades().then(res => {
        grades.value = res.grades || []
        if (route.query.grade_id) {
          const gradeId = parseInt(route.query.grade_id)
          if (grades.value.find(g => g.id === gradeId)) {
            selectedGrade.value = gradeId
          }
        }
      }),
      loadVipRecords()
    ])
  } catch (error) {
    ElMessage.error('加载数据失败')
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

.package-selection {
  margin: 20px 0;
}

.package-selection h3 {
  margin-bottom: 20px;
}

.package-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 15px;
}

.package-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fff;
}

.package-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.package-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.package-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.package-price {
  margin-bottom: 10px;
}

.package-price .price-value {
  font-size: 32px;
  font-weight: bold;
  color: #f56c6c;
}

.package-price .price-unit {
  font-size: 16px;
  color: #666;
  margin-left: 5px;
}

.package-monthly {
  font-size: 14px;
  color: #666;
}

.package-monthly .monthly-label {
  margin-right: 5px;
}

.package-monthly .monthly-value {
  color: #409eff;
  font-weight: bold;
}

.package-desc {
  margin-top: 15px;
  color: #999;
  font-size: 14px;
  text-align: center;
}

.special-option {
  margin-top: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.combo-option {
  margin-top: 15px;
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

.expired-text {
  color: #909399;
  text-decoration: line-through;
}

.payment-section {
  text-align: center;
  margin-top: 30px;
}
</style>

