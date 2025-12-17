<template>
  <div class="videos-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="header-left">
            <h2 class="page-title">视频学习</h2>
            <div class="page-subtitle">按知识点观看讲解视频，精准突破薄弱点</div>
          </div>
          <div class="header-right">
            <el-button @click="$router.push('/')">返回首页</el-button>
          </div>
        </div>
      </el-header>

      <el-main>
        <el-card class="videos-card">
          <template #header>
            <div class="card-header">
              <div class="header-left-row">
                <span>视频列表</span>
                <div class="stage-filters">
                  <el-button
                    size="small"
                    type="primary"
                    :plain="stage !== 'primary'"
                    @click="setStage('primary')"
                  >小学知识</el-button>
                  <el-button
                    size="small"
                    type="primary"
                    :plain="stage !== 'junior'"
                    @click="setStage('junior')"
                  >初中知识</el-button>
                  <el-button
                    size="small"
                    type="primary"
                    :plain="stage !== 'senior'"
                    @click="setStage('senior')"
                  >高中知识</el-button>
                </div>
              </div>
              <span class="count" v-if="total > 0">共 {{ total }} 个</span>
            </div>
          </template>

          <el-row :gutter="16">
            <el-col
              v-for="video in videos"
              :key="video.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="4"
              class="video-col"
            >
              <div class="video-item" @click="openPlayer(video)">
                <div class="cover-crop">
                  <img
                    class="cover-img"
                    :src="video.cover_image_url || fallbackCover"
                    :alt="video.title || '视频封面'"
                    loading="lazy"
                  />
                </div>
                <div class="video-meta">
                  <div class="video-title">{{ video.title || '未命名视频' }}</div>
                  <div class="video-tags">
                    <el-tag size="small">{{ video.grade_name }}</el-tag>
                    <el-tag size="small" type="warning">{{ video.subject_name }}</el-tag>
                    <el-tag size="small" type="info">{{ video.knowledge_point_name }}</el-tag>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>

          <div v-if="total > pageSize" class="pagination-wrap">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              @current-change="handlePageChange"
            />
          </div>

          <el-empty v-if="!loading && videos.length === 0" description="暂无已发布视频" />
        </el-card>
      </el-main>
    </el-container>

    <el-dialog
      v-model="playerVisible"
      :title="currentVideo?.title || '视频播放'"
      width="860px"
      class="player-dialog"
      destroy-on-close
    >
      <div v-if="currentVideo" class="video-crop">
        <video class="video-el" :src="currentVideo.video_url" controls playsinline />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="playerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { videoApi } from '@/api/video'

const videos = ref([])
const loading = ref(false)

const stage = ref('primary') // primary | junior | senior
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)

const playerVisible = ref(false)
const currentVideo = ref(null)

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
      <text x="50%" y="85%" text-anchor="middle" font-size="20" fill="#409eff" font-family="Arial">暂无封面</text>
    </svg>`
  )

const loadVideos = async () => {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize
    const res = await videoApi.getVideos({ stage: stage.value, limit: pageSize, offset })
    videos.value = res.videos || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('获取视频列表失败')
  } finally {
    loading.value = false
  }
}

const setStage = async (value) => {
  if (stage.value === value) return
  stage.value = value
  currentPage.value = 1
  await loadVideos()
}

const handlePageChange = async (page) => {
  currentPage.value = page
  await loadVideos()
}

const openPlayer = (video) => {
  if (!video?.video_url) {
    ElMessage.warning('该视频暂无播放地址')
    return
  }
  currentVideo.value = video
  playerVisible.value = true
}

onMounted(loadVideos)
</script>

<style scoped>
.videos-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 55%, #ffffff 100%);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 18px 0;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2d3d;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7a90;
}

.videos-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-filters :deep(.el-button) {
  border-radius: 10px;
  font-weight: 600;
}

.count {
  color: #6b7a90;
  font-size: 12px;
}

.video-item {
  cursor: pointer;
  border: 1px solid #e7eff8;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.14);
}

/* 封面比例：6:9（更接近竖版海报） + 上下各裁切 5% */
.cover-crop {
  width: 100%;
  aspect-ratio: 6 / 9;
  overflow: hidden;
  background: #f0f7ff;
}

.cover-img {
  width: 100%;
  height: 120%;
  object-fit: cover;
  transform: translateY(-10%);
  display: block;
}

.video-meta {
  padding: 12px 12px 14px;
}

.video-title {
  font-weight: 600;
  color: #1f2d3d;
  font-size: 14px;
  line-height: 20px;
  min-height: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-tags {
  margin-top: 10px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.video-crop {
  width: 100%;
  max-width: 820px;
  height: 462px;
  overflow: hidden;
  background: #000;
  border-radius: 12px;
}

.video-el {
  width: 100%;
  height: 110%;
  object-fit: cover;
  transform: translateY(-5%);
  display: block;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 18px 0 6px;
}
</style>


