<template>
  <div class="profile-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="$router.push('/')" :icon="ArrowLeft">返回首页</el-button>
          <h2>个人中心</h2>
        </div>
      </el-header>
      <el-main>
        <el-card>
          <h3>用户信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="手机号">{{ userStore.userInfo?.phone }}</el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ userStore.userInfo?.created_at }}</el-descriptions-item>
            <el-descriptions-item label="VIP状态">
              <el-tag v-if="userStore.isVip" type="success">VIP会员</el-tag>
              <el-tag v-else type="info">非VIP</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="VIP到期时间" v-if="userStore.vipInfo">
              {{ userStore.vipInfo.end_date || '无' }}
            </el-descriptions-item>
          </el-descriptions>
          
          <el-divider />
          
          <div class="vip-section">
            <h3>VIP管理</h3>
            <el-button type="primary" @click="$router.push('/vip')">
              {{ userStore.isVip ? '续费/升级VIP' : '购买VIP' }}
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
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { questionApi } from '@/api/question'
import { vipApi } from '@/api/vip'
import PaymentDialog from '@/components/PaymentDialog.vue'

const userStore = useUserStore()

const grades = ref([])
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

const loadGrades = async () => {
  try {
    const res = await questionApi.getGrades()
    grades.value = res.grades || []
  } catch (error) {
    ElMessage.error('获取年级列表失败')
  }
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

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

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

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await userStore.fetchUserInfo()
  }

  await Promise.all([
    loadGrades(),
    loadQuestionTypes(),
    loadDifficultyLevels()
  ])
})
</script>

<style scoped>
.profile-page {
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

.vip-section {
  margin-top: 20px;
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

