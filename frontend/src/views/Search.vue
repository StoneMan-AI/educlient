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
import UserActions from '@/components/UserActions.vue'

const router = useRouter()
const questionStore = useQuestionStore()

const grades = ref([])
const subjects = ref([])
const knowledgePoints = ref([])
const questions = ref([])
const total = ref(0)

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

const handleSearch = async () => {
  try {
    const res = await questionApi.searchQuestions({
      grade_id: searchForm.value.gradeId,
      subject_id: searchForm.value.subjectId,
      knowledge_point_id: searchForm.value.knowledgePointId
    })
    
    questions.value = res.questions || []
    total.value = res.total || 0
    
    // 保存筛选条件
    questionStore.setFilters({
      gradeId: searchForm.value.gradeId,
      subjectId: searchForm.value.subjectId,
      knowledgePointId: searchForm.value.knowledgePointId
    })
    
    if (questions.value.length === 0) {
      ElMessage.info('未找到相关试题')
    }
  } catch (error) {
    ElMessage.error('查询失败：' + (error.response?.data?.message || error.message))
  }
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

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

