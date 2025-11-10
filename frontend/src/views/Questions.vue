<template>
  <div class="questions-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="$router.push('/search')" :icon="ArrowLeft">返回查询</el-button>
          <div class="header-actions">
            <el-select v-model="sortBy" @change="handleSortChange" placeholder="排序方式" style="width: 150px; margin-right: 15px;">
              <el-option label="最新上传" value="created_at_desc" />
              <el-option label="最早上传" value="created_at_asc" />
              <el-option label="下载量最多" value="download_count_desc" />
              <el-option label="下载量最少" value="download_count_asc" />
            </el-select>
            <span class="selected-count">已选：{{ questionStore.selectedCount }}/15</span>
            <el-button 
              type="primary" 
              @click="handleOneClickGenerate"
              :disabled="questionStore.selectedCount > 0"
            >
              一键生成试题组
            </el-button>
            <el-button 
              type="success" 
              @click="handleDownload"
              :disabled="questionStore.selectedCount === 0"
            >
              下载试题组
            </el-button>
          </div>
        </div>
      </el-header>
      <el-main>
        <div class="question-layout">
          <div class="question-main">
            <el-card v-if="currentQuestion" class="question-card">
              <div class="question-header">
                <div class="question-info">
                  <el-tag>第 {{ currentIndex + 1 }} / {{ total }} 题</el-tag>
                  <el-tag type="success">{{ currentQuestion.difficulty_name }}</el-tag>
                  <el-tag type="info">
                    {{ currentQuestion.question_type_name || '题型未设置' }}
                  </el-tag>
                  <el-tag v-if="questionStore.isDownloaded(currentQuestion.id)" type="warning">已下载</el-tag>
                </div>
                <div class="question-actions">
                  <el-checkbox
                    v-model="isSelected"
                    @change="handleToggleSelect"
                    :disabled="!questionStore.canSelectMore && !isSelected"
                  >
                    选中此题
                  </el-checkbox>
                  <el-button @click="handleViewAnswer">查看答案</el-button>
                </div>
              </div>
              
              <div class="question-content">
                <img 
                  v-if="currentQuestion.question_image_url" 
                  :src="currentQuestion.question_image_url" 
                  alt="题目"
                  class="question-image"
                />
                <div v-else class="no-image">暂无题目图片</div>
              </div>
              
              <div class="question-footer">
                <el-button-group>
                  <el-button @click="handlePrev" :disabled="currentIndex === 0">上一题</el-button>
                  <el-button @click="handleNext" :disabled="currentIndex >= questions.length - 1">下一题</el-button>
                </el-button-group>
              </div>
            </el-card>
            
            <el-empty v-else description="暂无试题数据" />
          </div>
          
          <el-card class="selected-sidebar">
            <div class="sidebar-header">
              <span>已选试题</span>
              <span class="sidebar-count">{{ questionStore.selectedCount }}/15</span>
            </div>
            <el-empty
              v-if="selectedQuestionsDetails.length === 0"
              description="暂未选择试题"
            />
            <el-scrollbar v-else class="selected-scroll">
              <div
                v-for="item in selectedQuestionsDetails"
                :key="item.id"
                class="selected-item"
              >
                <div class="selected-info">
                  <el-tag type="success" size="small">{{ item.difficulty_name || '未知难度' }}</el-tag>
                  <el-tag type="info" size="small">{{ item.question_type_name || '题型未设置' }}</el-tag>
                </div>
                <el-button type="text" size="small" @click="handleRemoveSelected(item.id)">取消</el-button>
              </div>
            </el-scrollbar>
          </el-card>
        </div>
      </el-main>
    </el-container>
    
    <!-- 查看答案对话框 -->
    <AnswerDialog
      v-model="answerDialogVisible"
      :question="currentQuestion"
      @paid="handleAnswerPaid"
    />
    
    <!-- 支付对话框 -->
    <PaymentDialog
      v-model="paymentDialogVisible"
      :order-no="currentOrderNo"
      :amount="paymentAmount"
      :payment-type="paymentType"
      @paid="handlePaymentPaid"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { questionApi } from '@/api/question'
import { useQuestionStore } from '@/stores/question'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import AnswerDialog from '@/components/AnswerDialog.vue'
import PaymentDialog from '@/components/PaymentDialog.vue'

const route = useRoute()
const router = useRouter()
const questionStore = useQuestionStore()
const userStore = useUserStore()

const questions = ref([])
const currentIndex = ref(0)
const total = ref(0)
const currentQuestion = ref(null)
const answerDialogVisible = ref(false)
const paymentDialogVisible = ref(false)
const currentOrderNo = ref('')
const paymentAmount = ref(0)
const paymentType = ref('answer') // 'answer' | 'download'
const sortBy = ref('created_at_desc') // 默认按最新上传时间排序

const isSelected = computed(() => {
  return currentQuestion.value ? questionStore.isSelected(currentQuestion.value.id) : false
})

const selectedQuestionsDetails = computed(() => {
  return questionStore.selectedQuestions
    .map(id => questions.value.find(q => q.id === id))
    .filter(Boolean)
})

const loadQuestions = async () => {
  try {
    const params = {
      grade_id: route.query.grade_id,
      subject_id: route.query.subject_id,
      knowledge_point_id: route.query.knowledge_point_id,
      sort_by: sortBy.value
    }
    
    const res = await questionApi.searchQuestions(params)
    questions.value = res.questions || []
    total.value = res.total || 0
    
    if (questions.value.length > 0) {
      // 如果当前索引超出范围，重置为0
      if (currentIndex.value >= questions.value.length) {
        currentIndex.value = 0
      }
      currentQuestion.value = questions.value[currentIndex.value]
      questionStore.setCurrentQuestion(currentQuestion.value)
    } else {
      currentIndex.value = 0
      currentQuestion.value = null
    }
    
    // 如果是VIP用户，加载已下载的题目
    if (userStore.isVip && params.knowledge_point_id) {
      try {
        const downloadedRes = await questionApi.getDownloadedQuestions(params.knowledge_point_id)
        questionStore.setDownloadedQuestions(downloadedRes.question_ids || [])
      } catch (error) {
        console.error('获取已下载题目失败', error)
      }
    }
  } catch (error) {
    ElMessage.error('加载试题失败：' + (error.response?.data?.message || error.message))
  }
}

const handleSortChange = () => {
  // 排序改变时，重置到第一题并重新加载
  currentIndex.value = 0
  loadQuestions()
}

const handlePrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    currentQuestion.value = questions.value[currentIndex.value]
    questionStore.setCurrentQuestion(currentQuestion.value)
  }
}

const handleNext = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    currentQuestion.value = questions.value[currentIndex.value]
    questionStore.setCurrentQuestion(currentQuestion.value)
  }
}

const handleToggleSelect = (checked) => {
  if (currentQuestion.value) {
    if (checked && !questionStore.canSelectMore) {
      ElMessage.warning('最多只能选择15道题')
      return
    }
    questionStore.toggleSelect(currentQuestion.value.id)
  }
}

const handleRemoveSelected = (questionId) => {
  questionStore.toggleSelect(questionId)
}

const handleViewAnswer = async () => {
  if (!currentQuestion.value) return
  
  // 未登录用户
  if (!userStore.isLoggedIn) {
    ElMessageBox.confirm('查看答案需要注册账号，是否前往注册？', '提示', {
      confirmButtonText: '前往注册',
      cancelButtonText: '取消'
    }).then(() => {
      router.push('/login')
    })
    return
  }
  
  // VIP用户
  if (userStore.isVip) {
    const gradeId = currentQuestion.value.grade_id
    const vipGrades = userStore.vipGrades
    
    if (!vipGrades.includes(gradeId)) {
      const gradeName = currentQuestion.value.grade_name
      ElMessageBox.confirm(
        `当前试题属于${gradeName}，您需要购买该年级的VIP权限才能查看答案。是否前往购买？`,
        'VIP权限提示',
        {
          confirmButtonText: '前往购买',
          cancelButtonText: '取消'
        }
      ).then(() => {
        router.push({
          name: 'Vip',
          query: { grade_id: gradeId }
        })
      })
      return
    }
    
    // VIP用户直接显示答案
    answerDialogVisible.value = true
    return
  }
  
  // 已登录用户（非VIP）
  try {
    const res = await questionApi.viewAnswer(currentQuestion.value.id)
    if (res.need_payment) {
      // 需要支付
      paymentType.value = 'answer'
      currentOrderNo.value = res.order_no
      paymentAmount.value = res.amount
      paymentDialogVisible.value = true
    } else {
      // 已支付，直接显示答案
      answerDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('查看答案失败：' + (error.response?.data?.message || error.message))
  }
}

const handlePaymentPaid = async () => {
  paymentDialogVisible.value = false
  
  // 刷新用户信息（可能VIP状态已更新）
  if (userStore.isLoggedIn) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('刷新用户信息失败', error)
    }
  }
  
  if (paymentType.value === 'answer') {
    // 查看答案：重新获取答案（此时订单已支付）
    try {
      const res = await questionApi.viewAnswer(currentQuestion.value.id)
      if (!res.need_payment) {
        answerDialogVisible.value = true
      } else {
        ElMessage.error('获取答案失败，请稍后重试')
      }
    } catch (error) {
      ElMessage.error('获取答案失败：' + (error.response?.data?.message || error.message))
    }
  } else if (paymentType.value === 'download') {
    // 下载试题组
    await performDownload()
  }
}

const handleOneClickGenerate = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  try {
    const params = {
      grade_id: route.query.grade_id,
      subject_id: route.query.subject_id,
      knowledge_point_id: route.query.knowledge_point_id
    }
    
    const res = await questionApi.generateQuestionGroup(params)
    const questionIds = res.question_ids || []
    
    if (questionIds.length === 0) {
      ElMessageBox.confirm(
        '当前知识点下所有题目都已下载，是否重置已下载标记？',
        '提示',
        {
          confirmButtonText: '重置',
          cancelButtonText: '取消'
        }
      ).then(async () => {
        try {
          await questionApi.resetDownloadedQuestions(params.knowledge_point_id)
          questionStore.setDownloadedQuestions([])
          ElMessage.success('已重置')
          // 重新生成
          handleOneClickGenerate()
        } catch (error) {
          ElMessage.error('重置失败')
        }
      })
      return
    }
    
    questionStore.selectedQuestions = questionIds
    ElMessage.success(`已生成 ${questionIds.length} 道试题`)
    
    // 跳转到第一道选中的题目
    if (questionIds.length > 0) {
      const firstIndex = questions.value.findIndex(q => q.id === questionIds[0])
      if (firstIndex > -1) {
        currentIndex.value = firstIndex
        currentQuestion.value = questions.value[firstIndex]
        questionStore.setCurrentQuestion(currentQuestion.value)
      }
    }
  } catch (error) {
    ElMessage.error('生成失败：' + (error.response?.data?.message || error.message))
  }
}

const handleDownload = async () => {
  if (questionStore.selectedCount === 0) {
    ElMessage.warning('请先选择试题')
    return
  }
  
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  // 直接调用下载，performDownload会处理支付逻辑
  await performDownload()
}

const performDownload = async () => {
  try {
    const downloadResult = await questionApi.downloadQuestionGroup(questionStore.selectedQuestions)
    
    if (downloadResult instanceof Blob) {
      const url = window.URL.createObjectURL(downloadResult)
      const link = document.createElement('a')
      link.href = url
      link.download = '试题组.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('下载成功')
      questionStore.clearSelection()
      
      // VIP用户：刷新已下载列表
      if (userStore.isVip && route.query.knowledge_point_id) {
        const downloadedRes = await questionApi.getDownloadedQuestions(route.query.knowledge_point_id)
        questionStore.setDownloadedQuestions(downloadedRes.question_ids || [])
      }
    } else if (downloadResult && downloadResult.need_payment) {
      // 需要支付
      paymentType.value = 'download'
      currentOrderNo.value = downloadResult.order_no
      paymentAmount.value = downloadResult.amount
      paymentDialogVisible.value = true
    } else {
      ElMessage.error('下载失败：未知错误')
    }
  } catch (error) {
    ElMessage.error('下载失败：' + (error.response?.data?.message || error.message))
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.questions-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.selected-count {
  font-weight: bold;
  color: #409eff;
}

.question-card {
  max-width: 1200px;
  margin: 0 auto;
}

.question-layout {
  display: flex;
  gap: 20px;
}

.question-main {
  flex: 1;
}

.selected-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: 640px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 10px;
}

.sidebar-count {
  color: #409eff;
}

.selected-scroll {
  max-height: 520px;
}

.selected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.selected-item:last-child {
  border-bottom: none;
}

.selected-info {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.question-info {
  display: flex;
  gap: 10px;
}

.question-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.question-content {
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 30px 0;
}

.question-image {
  max-width: 100%;
  max-height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.no-image {
  color: #999;
  font-size: 16px;
}

.question-footer {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}
</style>

