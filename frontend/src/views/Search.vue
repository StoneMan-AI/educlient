<template>
  <div class="search-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="$router.push('/')" :icon="ArrowLeft">返回首页</el-button>
          <h2>查询试题</h2>
          <UserActions />
        </div>
      </el-header>
      <el-main>
        <el-card>
          <el-form :model="searchForm" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="年级">
                  <el-select v-model="searchForm.gradeId" placeholder="请选择年级" @change="handleGradeChange">
                    <el-option
                      v-for="grade in grades"
                      :key="grade.id"
                      :label="grade.name"
                      :value="grade.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="学科">
                  <el-select v-model="searchForm.subjectId" placeholder="请先选择年级" @change="handleSubjectChange" :disabled="!searchForm.gradeId">
                    <el-option
                      v-for="subject in subjects"
                      :key="subject.id"
                      :label="subject.name"
                      :value="subject.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="知识点">
                  <el-select v-model="searchForm.knowledgePointId" placeholder="请先选择学科" :disabled="!searchForm.subjectId">
                    <el-option
                      v-for="kp in knowledgePoints"
                      :key="kp.id"
                      :label="kp.name"
                      :value="kp.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :disabled="!canSearch">
                查询试题
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card v-if="hasVisitHistory && visitedGradeKnowledgePoints.length > 0" class="featured-kp-card">
          <template #header>
            <div class="featured-header">学年知识点预览</div>
          </template>
          <div class="featured-sections">
            <div v-for="subjectGroup in visitedGradeKnowledgePoints" :key="subjectGroup.subjectId" class="featured-section">
              <div class="section-title">{{ subjectGroup.gradeName }}{{ subjectGroup.subjectName }}</div>
              <div class="kp-grid">
                <a v-for="kp in subjectGroup.knowledgePoints" :key="kp.id" class="kp-item" @click="goByKnowledgePoint(kp, subjectGroup.subjectId)">{{ kp.name }}</a>
              </div>
            </div>
          </div>
        </el-card>
        
        <el-card v-if="questions.length > 0" class="result-card">
          <template #header>
            <div class="result-header">
              <span>找到 {{ total }} 道试题</span>
              <el-button type="primary" @click="goToQuestions">查看试题</el-button>
            </div>
          </template>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { questionApi } from '@/api/question'
import { useQuestionStore } from '@/stores/question'
import { ElMessage } from 'element-plus'

// 学段代表年级（用于快速入口）：小学=1、初中=7、高中=10、中考=9、高考=12
const FEATURED_GRADES = {
  primary: 1,
  junior: 7,
  senior: 10,
  zhongkao: 9,
  gaokao: 12
}
import UserActions from '@/components/UserActions.vue'

const router = useRouter()
const questionStore = useQuestionStore()

const grades = ref([])
const subjects = ref([])
const knowledgePoints = ref([])
const questions = ref([])
const total = ref(0)

const featured = ref({
  primary: [],
  junior: [],
  senior: [],
  zhongkao: [],
  gaokao: []
})

// 访问历史相关
const hasVisitHistory = ref(false)
const visitedGradeId = ref(null)
const visitedGradeName = ref('')
const visitedGradeKnowledgePoints = ref([]) // [{ subjectId, subjectName, gradeName, knowledgePoints: [...] }]

const searchForm = ref({
  gradeId: null,
  subjectId: null,
  knowledgePointId: null
})

const canSearch = computed(() => {
  return searchForm.value.gradeId && searchForm.value.subjectId && searchForm.value.knowledgePointId
})

const handleGradeChange = async () => {
  searchForm.value.subjectId = null
  searchForm.value.knowledgePointId = null
  subjects.value = []
  knowledgePoints.value = []
  
  if (searchForm.value.gradeId) {
    try {
      const res = await questionApi.getSubjects(searchForm.value.gradeId)
      subjects.value = res.subjects || []
    } catch (error) {
      ElMessage.error('获取学科列表失败')
    }
  }
}

const handleSubjectChange = async () => {
  searchForm.value.knowledgePointId = null
  knowledgePoints.value = []
  
  if (searchForm.value.subjectId) {
    try {
      const res = await questionApi.getKnowledgePoints(
        searchForm.value.gradeId,
        searchForm.value.subjectId
      )
      knowledgePoints.value = res.knowledge_points || []
    } catch (error) {
      ElMessage.error('获取知识点列表失败')
    }
  }
}

// 选择“数学”学科优先，否则取第一个学科
const pickSubjectId = (subjectList) => {
  if (!Array.isArray(subjectList) || subjectList.length === 0) return null
  const math = subjectList.find(s => s.name?.includes('数') || s.code?.toLowerCase() === 'math')
  return (math || subjectList[0]).id
}

// 从数组中随机抽取最多n个
const sampleArray = (arr, n) => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

// 加载某个学段的随机知识点（10个，跨学科/跨年级）
const loadFeaturedByStage = async (stageKey) => {
  try {
    const res = await questionApi.getRandomKnowledgePointsByStage(stageKey, 10)
    const kps = res.knowledge_points || []
    featured.value[stageKey] = kps
  } catch (e) {
    featured.value[stageKey] = []
  }
}

const goByFeatured = (kp) => {
  if (!kp || !kp.grade_id || !kp.subject_id) return
  router.push({
    name: 'Questions',
    query: {
      grade_id: kp.grade_id,
      subject_id: kp.subject_id,
      knowledge_point_id: kp.id
    }
  })
}

// 根据访问历史加载知识点预览
const loadVisitedGradeKnowledgePoints = async () => {
  try {
    const historyStr = localStorage.getItem('question_visit_history')
    if (!historyStr) {
      hasVisitHistory.value = false
      return
    }
    
    const history = JSON.parse(historyStr)
    if (!history.gradeId) {
      hasVisitHistory.value = false
      return
    }
    
    visitedGradeId.value = history.gradeId
    hasVisitHistory.value = true
    
    // 获取年级名称
    const grade = grades.value.find(g => g.id === history.gradeId)
    visitedGradeName.value = grade ? grade.name : ''
    
    // 获取该年级下的所有学科
    const subjectsRes = await questionApi.getSubjects(history.gradeId)
    let subjects = subjectsRes.subjects || []
    
    // 过滤学科：初中（7-9年级）和高中（10-12年级）只保留数学、物理、化学
    const gradeId = parseInt(history.gradeId)
    if (gradeId >= 7 && gradeId <= 9) {
      // 初中：只保留数学、物理、化学
      subjects = subjects.filter(subject => {
        const name = subject.name
        return name.includes('数学') || name.includes('物理') || name.includes('化学')
      })
    } else if (gradeId >= 10 && gradeId <= 12) {
      // 高中：只保留数学、物理、化学
      subjects = subjects.filter(subject => {
        const name = subject.name
        return name.includes('数学') || name.includes('物理') || name.includes('化学')
      })
    }
    // 小学（1-6年级）不做限制
    
    if (subjects.length === 0) {
      visitedGradeKnowledgePoints.value = []
      return
    }
    
    // 为每个学科加载知识点
    const knowledgePointsPromises = subjects.map(async (subject) => {
      try {
        const kpRes = await questionApi.getKnowledgePoints(history.gradeId, subject.id)
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          gradeName: visitedGradeName.value,
          knowledgePoints: kpRes.knowledge_points || []
        }
      } catch (error) {
        console.error(`加载学科 ${subject.name} 的知识点失败`, error)
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          gradeName: visitedGradeName.value,
          knowledgePoints: []
        }
      }
    })
    
    const results = await Promise.all(knowledgePointsPromises)
    // 过滤掉没有知识点的学科
    visitedGradeKnowledgePoints.value = results.filter(item => item.knowledgePoints.length > 0)
  } catch (error) {
    console.error('加载访问历史知识点失败', error)
    hasVisitHistory.value = false
    visitedGradeKnowledgePoints.value = []
  }
}

// 点击知识点跳转
const goByKnowledgePoint = (kp, subjectId) => {
  if (!visitedGradeId.value || !subjectId || !kp.id) return
  router.push({
    name: 'Questions',
    query: {
      grade_id: visitedGradeId.value,
      subject_id: subjectId,
      knowledge_point_id: kp.id
    }
  })
}

const handleSearch = async () => {
  // 直接跳转到试题展示页，由试题页负责加载数据
  // 保存筛选条件（供其他地方使用）
  questionStore.setFilters({
    gradeId: searchForm.value.gradeId,
    subjectId: searchForm.value.subjectId,
    knowledgePointId: searchForm.value.knowledgePointId
  })
  router.push({
    name: 'Questions',
    query: {
      grade_id: searchForm.value.gradeId,
      subject_id: searchForm.value.subjectId,
      knowledge_point_id: searchForm.value.knowledgePointId
    }
  })
}

const handleReset = () => {
  searchForm.value = {
    gradeId: null,
    subjectId: null,
    knowledgePointId: null
  }
  questions.value = []
  total.value = 0
  subjects.value = []
  knowledgePoints.value = []
}

const goToQuestions = () => {
  if (questions.value.length > 0) {
    router.push({
      name: 'Questions',
      query: {
        grade_id: searchForm.value.gradeId,
        subject_id: searchForm.value.subjectId,
        knowledge_point_id: searchForm.value.knowledgePointId
      }
    })
  }
}

onMounted(async () => {
  try {
    const res = await questionApi.getGrades()
    grades.value = res.grades || []
    
    // 检查是否有访问历史，如果有则加载访问过的年级的知识点预览
    // 必须在获取年级列表之后调用，以便获取年级名称
    await loadVisitedGradeKnowledgePoints()
  } catch (error) {
    ElMessage.error('获取年级列表失败')
  }
  
  // 如果没有访问历史，加载五个学段的随机知识点（保留原有功能，但不再显示）
  // 注意：这里不再显示这些随机知识点，因为需求是只有访问过试题展示页面才显示知识点预览
  // await Promise.all([
  //   loadFeaturedByStage('primary'),
  //   loadFeaturedByStage('junior'),
  //   loadFeaturedByStage('senior'),
  //   loadFeaturedByStage('zhongkao'),
  //   loadFeaturedByStage('gaokao')
  // ])
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: space-between;
  height: 100%;
}

.header-content h2 {
  margin: 0;
}

.result-card {
  margin-top: 20px;
}

.featured-kp-card {
  margin-top: 20px;
  margin-bottom: 20px;
}

.featured-header {
  font-weight: 600;
}

.featured-sections {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
}

.featured-section .section-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.kp-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px 12px;
}

.kp-item {
  display: inline-block;
  color: #409eff;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kp-item:hover {
  text-decoration: underline;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

