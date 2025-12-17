<template>
  <div class="home">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>轻松考-精准狙击各个知识点</h1>
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
          
          <!-- 用户好评区域 -->
          <div class="testimonials-section">
            <h2 class="testimonials-title">大家对轻松考的评价</h2>
            <el-row :gutter="20" class="testimonials-cards">
              <el-col :xs="24" :sm="24" :md="8" v-for="(testimonial, index) in testimonials" :key="index">
                <div class="testimonial-card">
                  <div class="testimonial-rating">
                    <el-icon v-for="i in 5" :key="i" class="star-icon">
                      <StarFilled />
                    </el-icon>
                  </div>
                  <p class="testimonial-text">{{ testimonial.text }}</p>
                  <div class="testimonial-author">{{ testimonial.author }}</div>
                  <div class="testimonial-verified">
                    <el-icon class="check-icon"><Check /></el-icon>
                    <span>已验证购买</span>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>

          <!-- 视频学习入口（好评下方） -->
          <div class="videos-section">
            <div class="videos-header">
              <div>
                <h2 class="videos-title">数学思维，清华教授1对1讲解视频</h2>
                <div class="videos-subtitle">点击封面进入视频列表，按知识点学习更高效</div>
              </div>
              <el-button type="primary" class="videos-more-btn" @click="goToVideos">查看更多</el-button>
            </div>

            <el-row :gutter="16" class="videos-grid">
              <el-col
                v-for="(item, index) in featuredVideosSlots"
                :key="index"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="4"
              >
                <div class="video-cover-item" @click="goToVideos">
                  <div class="cover-crop">
                    <img
                      class="cover-img"
                      :src="item?.cover_image_url || fallbackCover"
                      :alt="item?.title || '视频封面'"
                      loading="lazy"
                    />
                  </div>
                  <div class="cover-title">{{ item?.title || '学习视频' }}</div>
                </div>
              </el-col>
            </el-row>
          </div>
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
import { StarFilled, Check } from '@element-plus/icons-vue'
import { questionApi } from '@/api/question'
import { videoApi } from '@/api/video'
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

// 用户好评数据
const testimonials = ref([
  {
    text: '我家孩子用了之后，确实对课本的知识点有所突破，希望网站能越做越完善',
    author: '陈妈妈',
    rating: 5
  },
  {
    text: '题目都是来自全国省考的试题，VIP价格很便宜，比买练习册划算多了，拥有所有科目的，最主要的是很有针对性，题目也很新',
    author: '刘老师',
    rating: 5
  },
  {
    text: '我们家两个孩子都在用，他们说有很多经典题目，可以针对知识点进行专项训练，而且它还分了难度可以选，不像试卷或练习册，为了一道题，做了10道题',
    author: '赵妈妈',
    rating: 5
  }
])

// 首页视频封面（展示 5 张）
const featuredVideos = ref([])
const fallbackCover =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f0f7ff"/>
          <stop offset="100%" stop-color="#e8f4ff"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="400" cy="225" r="64" fill="#409eff" opacity="0.15"/>
      <polygon points="380,190 380,260 445,225" fill="#409eff"/>
      <text x="50%" y="85%" text-anchor="middle" font-size="20" fill="#409eff" font-family="Arial">视频学习</text>
    </svg>`
  )

const featuredVideosSlots = computed(() => {
  // 始终展示 5 张（没有数据时用占位）
  const slots = []
  for (let i = 0; i < 5; i += 1) {
    slots.push(featuredVideos.value[i] || null)
  }
  return slots
})

const goToVideos = () => {
  router.push({ name: 'Videos' })
}

const loadFeaturedVideos = async () => {
  try {
    const res = await videoApi.getVideos({ limit: 5 })
    featuredVideos.value = res.videos || []
  } catch (e) {
    // 首页不强提示，避免打扰用户
    featuredVideos.value = []
  }
}

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
    await loadFeaturedVideos()
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

/* 用户好评区域 */
.testimonials-section {
  margin-top: 80px;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
  border-radius: 12px;
  border: 1px solid #e0eef7;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.08);
}

.testimonials-title {
  text-align: center;
  color: #409eff;
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 50px;
}

.testimonials-cards {
  max-width: 1200px;
  margin: 0 auto;
}

.testimonial-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 30px;
  height: 100%;
  border: 1px solid #e0eef7;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.testimonial-card:hover {
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.testimonial-rating {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}

.star-icon {
  color: #ffc107;
  font-size: 20px;
}

.testimonial-text {
  color: #333333;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 20px;
  flex: 1;
}

.testimonial-author {
  font-weight: bold;
  font-size: 16px;
  color: #333333;
  margin-bottom: 12px;
}

.testimonial-verified {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #999999;
  font-size: 13px;
}

.check-icon {
  font-size: 14px;
  color: #999999;
}

/* 视频学习入口 */
.videos-section {
  margin-top: 28px;
  padding: 26px 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e7eff8;
  box-shadow: 0 4px 12px rgba(31, 45, 61, 0.04);
}

.videos-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.videos-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2d3d;
}

.videos-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7a90;
}

.videos-more-btn {
  border-radius: 10px;
}

.video-cover-item {
  cursor: pointer;
  border: 1px solid #e7eff8;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
}

.video-cover-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.12);
}

/* 上下各裁切 5% */
.cover-crop {
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: #f0f7ff;
}

.cover-img {
  width: 100%;
  height: 110%;
  object-fit: cover;
  transform: translateY(-5%);
  display: block;
}

.cover-title {
  padding: 10px 12px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .testimonials-section {
    padding: 40px 15px;
  }
  
  .testimonials-title {
    font-size: 24px;
    margin-bottom: 30px;
  }
  
  .testimonial-card {
    padding: 20px;
    margin-bottom: 20px;
  }

  .videos-section {
    padding: 20px 15px;
  }
}
</style>

