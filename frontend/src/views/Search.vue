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

        <el-card class="featured-kp-card">
          <template #header>
            <div class="featured-header">学年知识点预览</div>
          </template>
          <div class="featured-sections">
            <div class="featured-section">
              <div class="section-title">小学</div>
              <div class="kp-grid">
                <a v-for="kp in featured.primary" :key="kp.id" class="kp-item" @click="goByFeatured(kp)">{{ kp.name }}</a>
              </div>
            </div>
            <div class="featured-section">
              <div class="section-title">初中</div>
              <div class="kp-grid">
                <a v-for="kp in featured.junior" :key="kp.id" class="kp-item" @click="goByFeatured(kp)">{{ kp.name }}</a>
              </div>
            </div>
            <div class="featured-section">
              <div class="section-title">高中</div>
              <div class="kp-grid">
                <a v-for="kp in featured.senior" :key="kp.id" class="kp-item" @click="goByFeatured(kp)">{{ kp.name }}</a>
              </div>
            </div>
            <div class="featured-section">
              <div class="section-title">中考</div>
              <div class="kp-grid">
                <a v-for="kp in featured.zhongkao" :key="kp.id" class="kp-item" @click="goByFeatured(kp)">{{ kp.name }}</a>
              </div>
            </div>
            <div class="featured-section">
              <div class="section-title">高考</div>
              <div class="kp-grid">
                <a v-for="kp in featured.gaokao" :key="kp.id" class="kp-item" @click="goByFeatured(kp)">{{ kp.name }}</a>
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

// 加载某个学段的随机知识点（10个）
const loadFeaturedByStage = async (stageKey, gradeId) => {
  try {
    const subRes = await questionApi.getSubjects(gradeId)
    const subjectList = subRes.subjects || []
    const subjectId = pickSubjectId(subjectList)
    if (!subjectId) {
      featured.value[stageKey] = []
      return
    }
    const kpRes = await questionApi.getKnowledgePoints(gradeId, subjectId)
    const kps = kpRes.knowledge_points || []
    featured.value[stageKey] = sampleArray(kps, 10).map(kp => ({
      ...kp,
      _grade_id: gradeId,
      _subject_id: subjectId
    }))
  } catch (e) {
    featured.value[stageKey] = []
  }
}

const goByFeatured = (kp) => {
  if (!kp || !kp._grade_id || !kp._subject_id) return
  router.push({
    name: 'Questions',
    query: {
      grade_id: kp._grade_id,
      subject_id: kp._subject_id,
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
  } catch (error) {
    ElMessage.error('获取年级列表失败')
  }
  
  // 加载五个学段的随机知识点
  await Promise.all([
    loadFeaturedByStage('primary', FEATURED_GRADES.primary),
    loadFeaturedByStage('junior', FEATURED_GRADES.junior),
    loadFeaturedByStage('senior', FEATURED_GRADES.senior),
    loadFeaturedByStage('zhongkao', FEATURED_GRADES.zhongkao),
    loadFeaturedByStage('gaokao', FEATURED_GRADES.gaokao)
  ])
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

