<template>
  <div class="home">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>试题图片组合网站</h1>
          <UserActions />
        </div>
      </el-header>
      <el-main>
        <div class="home-content">
          <el-row :gutter="20">
            <el-col :span="24">
              <el-card class="welcome-card">
                <template #header>
                  <div class="card-header">通过年级、学科、知识点查询试题，组合生成专项练习题组</div>
                </template>
                <el-form :model="searchForm" label-width="100px">
                  <el-row :gutter="20">
                    <el-col :span="8">
                      <el-form-item label="年级">
                        <el-select v-model="searchForm.gradeId" placeholder="请选择年级" @change="handleGradeChange" clearable>
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
                        <el-select v-model="searchForm.subjectId" placeholder="请先选择年级" @change="handleSubjectChange" :disabled="!searchForm.gradeId" clearable>
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
                        <el-select v-model="searchForm.knowledgePointId" placeholder="请先选择学科" :disabled="!searchForm.subjectId" clearable>
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
                    <el-button type="primary" :disabled="!canSearch" @click="handleSearch">查询试题</el-button>
                    <el-button @click="handleReset">重置</el-button>
                  </el-form-item>
                </el-form>
              </el-card>
              <el-row :gutter="20" class="feature-cards">
                <el-col :span="8">
                  <el-card>
                    <h3>查询试题</h3>
                    <p>按年级、学科、知识点精准查询试题</p>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card>
                    <h3>组合试题</h3>
                    <p>手动勾选或一键生成15道题</p>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card>
                    <h3>导出PDF</h3>
                    <p>生成试题组和答案组PDF文件</p>
                  </el-card>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import UserActions from '@/components/UserActions.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { questionApi } from '@/api/question'
import { useQuestionStore } from '@/stores/question'

const router = useRouter()
const questionStore = useQuestionStore()

const grades = ref([])
const subjects = ref([])
const knowledgePoints = ref([])

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

const handleSearch = () => {
  // 保存筛选条件并跳转到试题展示
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
  subjects.value = []
  knowledgePoints.value = []
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
.home {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content h1 {
  margin: 0;
  color: #409eff;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.home-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.welcome-card {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-card h2 {
  margin-bottom: 20px;
}

.welcome-card p {
  margin-bottom: 30px;
  color: #666;
}

.feature-cards {
  margin-top: 40px;
}

.feature-cards h3 {
  margin-bottom: 10px;
  color: #409eff;
}

.feature-cards p {
  color: #666;
}
</style>

