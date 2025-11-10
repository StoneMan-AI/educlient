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

        <el-card class="owned-card">
          <div class="owned-header">
            <h3>已拥有试题</h3>
          </div>

          <div class="owned-search-bar">
            <el-form :model="ownedSearch" inline label-width="80px" class="owned-form">
              <el-form-item label="年级">
                <el-select
                  v-model="ownedSearch.grade_id"
                  placeholder="选择年级"
                  clearable
                  @change="handleOwnedGradeChange"
                  style="width: 140px;"
                >
                  <el-option
                    v-for="grade in grades"
                    :key="grade.id"
                    :label="grade.name"
                    :value="grade.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="学科">
                <el-select
                  v-model="ownedSearch.subject_id"
                  placeholder="选择学科"
                  clearable
                  :disabled="!ownedSearch.grade_id"
                  @change="handleOwnedSubjectChange"
                  style="width: 140px;"
                >
                  <el-option
                    v-for="subject in ownedSubjects"
                    :key="subject.id"
                    :label="subject.name"
                    :value="subject.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="知识点">
                <el-select
                  v-model="ownedSearch.knowledge_point_id"
                  placeholder="选择知识点"
                  clearable
                  :disabled="!ownedSearch.subject_id"
                  filterable
                  style="width: 180px;"
                >
                  <el-option
                    v-for="kp in ownedKnowledgePoints"
                    :key="kp.id"
                    :label="kp.name"
                    :value="kp.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="题型">
                <el-select
                  v-model="ownedSearch.question_type_id"
                  placeholder="选择题型"
                  clearable
                  style="width: 160px;"
                >
                  <el-option
                    v-for="type in questionTypes"
                    :key="type.id"
                    :label="type.name"
                    :value="type.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="难度">
                <el-select
                  v-model="ownedSearch.difficulty_id"
                  placeholder="选择难度"
                  clearable
                  style="width: 160px;"
                >
                  <el-option
                    v-for="diff in difficultyLevels"
                    :key="diff.id"
                    :label="diff.name"
                    :value="diff.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="handleOwnedSearch" :loading="ownedLoading">搜索</el-button>
                <el-button @click="handleOwnedReset" :disabled="ownedLoading">重置</el-button>
              </el-form-item>
            </el-form>

            <div class="owned-actions">
              <el-button
                type="success"
                :disabled="ownedSelected.length === 0 || downloadLoading"
                :loading="downloadLoading"
                @click="handleOwnedDownload"
              >
                下载已选试题
              </el-button>
            </div>
          </div>

          <el-table
            ref="ownedTableRef"
            :data="ownedQuestions"
            v-loading="ownedLoading"
            border
            height="480"
            @select="handleOwnedSelect"
            @selection-change="handleOwnedSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="grade_name" label="年级" width="100" />
            <el-table-column prop="subject_name" label="学科" width="120" />
            <el-table-column prop="knowledge_point_name" label="知识点" min-width="160" show-overflow-tooltip />
            <el-table-column prop="question_type_name" label="题型" width="140" />
            <el-table-column prop="difficulty_name" label="难度" width="120" />
            <el-table-column label="拥有时间" width="180">
              <template #default="scope">
                {{ formatDateTime(scope.row.owned_at) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="owned-pagination">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="ownedPage"
              :page-size="ownedPageSize"
              :total="ownedTotal"
              @current-change="handleOwnedPageChange"
            />
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

    <PaymentDialog
      v-model="downloadPaymentDialogVisible"
      :order-no="downloadOrderNo"
      :amount="downloadAmount"
      payment-type="download"
      @paid="handleDownloadPaid"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
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

// 已拥有试题相关
const ownedSearch = reactive({
  grade_id: null,
  subject_id: null,
  knowledge_point_id: null,
  question_type_id: null,
  difficulty_id: null
})
const ownedSubjects = ref([])
const ownedKnowledgePoints = ref([])
const questionTypes = ref([])
const difficultyLevels = ref([])
const ownedQuestions = ref([])
const ownedTotal = ref(0)
const ownedPage = ref(1)
const ownedPageSize = ref(15)
const ownedLoading = ref(false)
const ownedSelected = ref([])
const ownedTableRef = ref(null)
const downloadLoading = ref(false)
const downloadPaymentDialogVisible = ref(false)
const downloadOrderNo = ref('')
const downloadAmount = ref(0)
const pendingDownloadIds = ref([])

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

const loadQuestionTypes = async () => {
  try {
    const res = await questionApi.getQuestionTypes()
    questionTypes.value = res.question_types || []
  } catch (error) {
    console.error('加载题型失败', error)
  }
}

const loadDifficultyLevels = async () => {
  try {
    const res = await questionApi.getDifficultyLevels()
    difficultyLevels.value = res.difficulty_levels || []
  } catch (error) {
    console.error('加载难度失败', error)
  }
}

const loadOwnedSubjects = async (gradeId) => {
  if (!gradeId) {
    ownedSubjects.value = []
    return
  }
  try {
    const res = await questionApi.getSubjects(gradeId)
    ownedSubjects.value = res.subjects || []
  } catch (error) {
    console.error('加载学科失败', error)
  }
}

const loadOwnedKnowledgePoints = async (gradeId, subjectId) => {
  if (!gradeId || !subjectId) {
    ownedKnowledgePoints.value = []
    return
  }
  try {
    const res = await questionApi.getKnowledgePoints(gradeId, subjectId)
    ownedKnowledgePoints.value = res.knowledge_points || []
  } catch (error) {
    console.error('加载知识点失败', error)
  }
}

const handleOwnedGradeChange = async (value) => {
  ownedSearch.subject_id = null
  ownedSearch.knowledge_point_id = null
  ownedSubjects.value = []
  ownedKnowledgePoints.value = []
  ownedSelected.value = []
  if (ownedTableRef.value) {
    ownedTableRef.value.clearSelection()
  }
  if (value) {
    await loadOwnedSubjects(value)
  }
}

const handleOwnedSubjectChange = async (value) => {
  ownedSearch.knowledge_point_id = null
  ownedKnowledgePoints.value = []
  ownedSelected.value = []
  if (ownedTableRef.value) {
    ownedTableRef.value.clearSelection()
  }
  if (ownedSearch.grade_id && value) {
    await loadOwnedKnowledgePoints(ownedSearch.grade_id, value)
  }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const handleOwnedSearch = () => {
  if (!ownedSearch.grade_id || !ownedSearch.subject_id) {
    ElMessage.warning('请选择年级和学科')
    return
  }
  ownedPage.value = 1
  fetchOwnedQuestions()
}

const handleOwnedReset = () => {
  ownedSearch.grade_id = null
  ownedSearch.subject_id = null
  ownedSearch.knowledge_point_id = null
  ownedSearch.question_type_id = null
  ownedSearch.difficulty_id = null
  ownedSubjects.value = []
  ownedKnowledgePoints.value = []
  ownedQuestions.value = []
  ownedTotal.value = 0
  ownedSelected.value = []
  ownedPage.value = 1
  if (ownedTableRef.value) {
    ownedTableRef.value.clearSelection()
  }
}

const fetchOwnedQuestions = async () => {
  if (!ownedSearch.grade_id || !ownedSearch.subject_id) {
    return
  }
  ownedLoading.value = true
  try {
    const params = {
      grade_id: ownedSearch.grade_id,
      subject_id: ownedSearch.subject_id,
      page: ownedPage.value,
      page_size: ownedPageSize.value
    }
    if (ownedSearch.knowledge_point_id) params.knowledge_point_id = ownedSearch.knowledge_point_id
    if (ownedSearch.question_type_id) params.question_type_id = ownedSearch.question_type_id
    if (ownedSearch.difficulty_id) params.difficulty_id = ownedSearch.difficulty_id

    const res = await vipApi.getOwnedQuestions(params)
    if (res.success) {
      const selectedIds = new Set(ownedSelected.value.map(item => item.id))
      ownedQuestions.value = res.questions || []
      ownedTotal.value = res.total || 0

      await nextTick()
      if (ownedTableRef.value) {
        ownedTableRef.value.clearSelection()
        ownedQuestions.value.forEach(row => {
          if (selectedIds.has(row.id)) {
            ownedTableRef.value.toggleRowSelection(row, true)
          }
        })
      }
      ownedSelected.value = ownedQuestions.value.filter(item => selectedIds.has(item.id))
    }
  } catch (error) {
    ElMessage.error('加载已拥有试题失败：' + (error.response?.data?.message || error.message))
  } finally {
    ownedLoading.value = false
  }
}

const handleOwnedPageChange = (page) => {
  ownedPage.value = page
  fetchOwnedQuestions()
}

const handleOwnedSelect = (selection, row) => {
  if (selection.length > 15) {
    ElMessage.warning('最多选择15道试题')
    if (ownedTableRef.value) {
      ownedTableRef.value.toggleRowSelection(row, false)
    }
    return
  }
  ownedSelected.value = selection
}

const handleOwnedSelectionChange = (selection) => {
  ownedSelected.value = selection
}

const handleOwnedDownload = async () => {
  if (ownedSelected.value.length === 0) {
    ElMessage.warning('请先勾选试题')
    return
  }

  pendingDownloadIds.value = ownedSelected.value.map(item => item.id)
  downloadLoading.value = true

  try {
    const result = await questionApi.downloadQuestionGroup(pendingDownloadIds.value)
    if (result instanceof Blob) {
      const url = window.URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = '已拥有试题.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      ElMessage.success('下载成功')
      pendingDownloadIds.value = []
    } else if (result && result.need_payment) {
      downloadOrderNo.value = result.order_no
      downloadAmount.value = result.amount
      downloadPaymentDialogVisible.value = true
    } else {
      ElMessage.error('下载失败：未知错误')
    }
  } catch (error) {
    ElMessage.error('下载失败：' + (error.response?.data?.message || error.message))
  } finally {
    downloadLoading.value = false
  }
}

const handleDownloadPaid = async () => {
  downloadPaymentDialogVisible.value = false
  if (pendingDownloadIds.value.length === 0) {
    return
  }

  downloadLoading.value = true
  try {
    const result = await questionApi.downloadQuestionGroup(pendingDownloadIds.value)
    if (result instanceof Blob) {
      const url = window.URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = '已拥有试题.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      ElMessage.success('下载成功')
      pendingDownloadIds.value = []
    } else {
      ElMessage.error('下载失败：未知错误')
    }
  } catch (error) {
    ElMessage.error('下载失败：' + (error.response?.data?.message || error.message))
  } finally {
    downloadLoading.value = false
  }
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

    await Promise.all([
      loadQuestionTypes(),
      loadDifficultyLevels()
    ])
  } catch (error) {
    ElMessage.error('获取年级列表失败')
  }
})

watch(() => userStore.isVip, (val) => {
  if (!val) {
    ownedQuestions.value = []
    ownedTotal.value = 0
    ownedSelected.value = []
    if (ownedTableRef.value) {
      ownedTableRef.value.clearSelection()
    }
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

.owned-card {
  margin-top: 20px;
}

.owned-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.owned-search-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.owned-form {
  flex: 1;
  min-width: 600px;
}

.owned-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 200px;
}

.owned-pagination {
  margin-top: 20px;
  text-align: right;
}
</style>
</style>

