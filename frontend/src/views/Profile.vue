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
                  v-model="ownedSearch.knowledge_point_ids"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
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
                  v-model="ownedSearch.question_type_ids"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
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
                  v-model="ownedSearch.difficulty_ids"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
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
              <span class="owned-count" :class="{ 'count-warning': ownedSelected.length > 15 }">
                已选：{{ ownedSelected.length }}/15
              </span>
              <el-button
                type="success"
                :disabled="ownedSelected.length === 0 || ownedSelected.length > 15 || downloadLoading"
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
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" text @click="handleOwnedViewQuestion(scope.row)">查看题目</el-button>
                <el-button type="success" text @click="handleOwnedViewAnswer(scope.row)">查看答案</el-button>
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

    <el-dialog
      v-model="questionPreviewDialogVisible"
      title="题目预览"
      width="80%"
      destroy-on-close
    >
      <div v-if="previewQuestion">
        <img
          v-if="previewQuestion.question_image_url"
          :src="previewQuestion.question_image_url"
          alt="题目"
          style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;"
        />
        <div v-else class="no-image">暂无题目图片</div>
      </div>
      <template #footer>
        <el-button @click="questionPreviewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <AnswerDialog
      v-model="answerDialogVisible"
      :question="previewAnswer"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AnswerDialog from '@/components/AnswerDialog.vue'
import { useUserStore } from '@/stores/user'
import { questionApi } from '@/api/question'
import { vipApi } from '@/api/vip'
import PaymentDialog from '@/components/PaymentDialog.vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const grades = ref([])
const ownedSearch = reactive({
  grade_id: null,
  subject_id: null,
  knowledge_point_ids: [],
  question_type_ids: [],
  difficulty_ids: []
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
const questionPreviewDialogVisible = ref(false)
const answerDialogVisible = ref(false)
const previewQuestion = ref(null)
const previewAnswer = ref(null)

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
    if (res && res.success) {
      questionTypes.value = res.question_types || []
    } else {
      questionTypes.value = res?.question_types || []
    }
  } catch (error) {
    questionTypes.value = []
    console.error('加载题型失败', error)
    ElMessage.error('加载题型失败')
  }
}

const loadDifficultyLevels = async () => {
  try {
    const res = await questionApi.getDifficultyLevels()
    if (res && res.success) {
      difficultyLevels.value = res.difficulty_levels || []
    } else {
      difficultyLevels.value = res?.difficulty_levels || []
    }
  } catch (error) {
    difficultyLevels.value = []
    console.error('加载难度失败', error)
    ElMessage.error('加载难度失败')
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
    const availableIds = new Set(ownedKnowledgePoints.value.map(item => item.id))
    ownedSearch.knowledge_point_ids = ownedSearch.knowledge_point_ids.filter(id => availableIds.has(id))
  } catch (error) {
    console.error('加载知识点失败', error)
  }
}

const handleOwnedGradeChange = async (value) => {
  ownedSearch.subject_id = null
  ownedSearch.knowledge_point_ids = []
  ownedSearch.question_type_ids = []
  ownedSearch.difficulty_ids = []
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
  ownedSearch.knowledge_point_ids = []
  ownedSearch.question_type_ids = []
  ownedSearch.difficulty_ids = []
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
  ownedSearch.knowledge_point_ids = []
  ownedSearch.question_type_ids = []
  ownedSearch.difficulty_ids = []
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
    if (ownedSearch.knowledge_point_ids && ownedSearch.knowledge_point_ids.length > 0) {
      params.knowledge_point_ids = ownedSearch.knowledge_point_ids.map(id => Number(id))
    }
    if (ownedSearch.question_type_ids && ownedSearch.question_type_ids.length > 0) {
      params.question_type_ids = ownedSearch.question_type_ids.map(id => Number(id))
    }
    if (ownedSearch.difficulty_ids && ownedSearch.difficulty_ids.length > 0) {
      params.difficulty_ids = ownedSearch.difficulty_ids.map(id => Number(id))
    }

    const res = await vipApi.getOwnedQuestions(params)
    if (res.success) {
      // 保存当前所有选中项的ID（包括其他页面的）
      const selectedIds = new Set(ownedSelected.value.map(item => item.id))
      ownedQuestions.value = res.questions || []
      ownedTotal.value = res.total || 0

      // 恢复当前页面的选中状态（不修改ownedSelected，保持跨页选中状态）
      await nextTick()
      if (ownedTableRef.value) {
        ownedTableRef.value.clearSelection()
        ownedQuestions.value.forEach(row => {
          if (selectedIds.has(row.id)) {
            ownedTableRef.value.toggleRowSelection(row, true)
          }
        })
      }
      // 注意：这里不更新ownedSelected，保持跨页选中状态
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
  const currentlySelectedIds = new Set(ownedSelected.value.map(item => item.id))
  const rowSelected = selection.some(item => item.id === row.id)

  if (rowSelected) {
    if (!currentlySelectedIds.has(row.id)) {
      const rowData = ownedQuestions.value.find(item => item.id === row.id)
      if (rowData) {
        const newSelection = [...ownedSelected.value, rowData]
        if (newSelection.length > 15) {
          ElMessage.warning('最多选择15道试题')
          if (ownedTableRef.value) {
            nextTick(() => {
              ownedTableRef.value.toggleRowSelection(row, false)
            })
          }
          return
        }
        ownedSelected.value = newSelection
      }
    }
  } else if (currentlySelectedIds.has(row.id)) {
    ownedSelected.value = ownedSelected.value.filter(item => item.id !== row.id)
  }
}

const handleOwnedSelectionChange = (selection) => {
  const maxSelection = 15
  const currentPageIds = new Set(ownedQuestions.value.map(item => item.id))
  const preservedSelections = ownedSelected.value.filter(item => !currentPageIds.has(item.id))
  const merged = [...preservedSelections, ...selection]
  if (merged.length > maxSelection) {
    ElMessage.warning('最多选择15道试题')
    const allowable = merged.slice(0, maxSelection)
    ownedSelected.value = allowable
    if (ownedTableRef.value) {
      nextTick(() => {
        ownedQuestions.value.forEach(row => {
          const shouldSelect = allowable.some(item => item.id === row.id)
          ownedTableRef.value.toggleRowSelection(row, shouldSelect)
        })
      })
    }
  } else {
    ownedSelected.value = merged
  }
}

const handleOwnedViewQuestion = async (row) => {
  try {
    const res = await questionApi.getQuestionDetail(row.id)
    previewQuestion.value = res.question || null
    previewAnswer.value = null
    if (!previewQuestion.value) {
      ElMessage.warning('未找到题目信息')
      return
    }
    questionPreviewDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取题目信息失败：' + (error.response?.data?.message || error.message))
  }
}

const handleOwnedViewAnswer = async (row) => {
  try {
    const res = await questionApi.viewAnswer(row.id)
    if (res.need_payment) {
      ElMessage.warning('请在试题页面完成支付后再查看答案')
    } else {
      previewQuestion.value = {
        id: row.id,
        question_image_url: row.question_image_url || null,
        grade_name: row.grade_name,
        subject_name: row.subject_name,
        knowledge_point_name: row.knowledge_point_name
      }
      previewAnswer.value = res.answer_url ? { id: row.id, answer_image_url: res.answer_url } : null
      answerDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('查看答案失败：' + (error.response?.data?.message || error.message))
  }
}

const createDownloadRecord = async (orderNo) => {
  if (pendingDownloadIds.value.length === 0) {
    ElMessage.warning('请先勾选试题')
    return
  }

  downloadLoading.value = true
  try {
    const result = await questionApi.downloadQuestionGroup(pendingDownloadIds.value, orderNo)
    if (result && result.need_payment) {
      downloadOrderNo.value = result.order_no
      downloadAmount.value = result.amount
      downloadPaymentDialogVisible.value = true
      ElMessage.info('请完成支付以生成下载文件')
    } else if (result && result.success && result.download) {
      ElMessage.success('下载文件已生成，请前往下载管理页下载')
      pendingDownloadIds.value = []
      ownedSelected.value = []
      if (ownedTableRef.value) {
        ownedTableRef.value.clearSelection()
      }
      downloadAmount.value = 0
      router.push('/downloads')
    } else {
      ElMessage.error('下载失败：未知错误')
    }
  } catch (error) {
    ElMessage.error('下载失败：' + (error.response?.data?.message || error.message))
    downloadAmount.value = 0
  } finally {
    downloadLoading.value = false
  }
}

const handleOwnedDownload = async () => {
  if (ownedSelected.value.length === 0) {
    ElMessage.warning('请先勾选试题')
    return
  }
  
  // 检查题目数量（最多15道）
  if (ownedSelected.value.length > 15) {
    ElMessage.warning(`最多只能选择15道试题，当前已选择${ownedSelected.value.length}道，请取消部分选择`)
    return
  }
  
  pendingDownloadIds.value = ownedSelected.value.map(item => item.id)
  await createDownloadRecord()
}

const handleDownloadPaid = async () => {
  downloadPaymentDialogVisible.value = false
  if (pendingDownloadIds.value.length === 0) {
    return
  }
  const orderNo = downloadOrderNo.value
  downloadOrderNo.value = ''
  await createDownloadRecord(orderNo)
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
  gap: 12px;
}

.owned-count {
  font-size: 14px;
  color: #409eff;
  font-weight: bold;
}

.owned-count.count-warning {
  color: #f56c6c;
}

.owned-pagination {
  margin-top: 20px;
  text-align: right;
}
</style>

