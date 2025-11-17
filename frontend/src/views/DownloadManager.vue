<template>
  <div class="download-page">
    <el-container>
      <el-header>
        <div class="header-content">
          <el-button @click="$router.push('/search')" :icon="ArrowLeft">返回查询</el-button>
          <h2>下载管理</h2>
          <el-button type="primary" @click="fetchDownloads" :loading="loading">刷新</el-button>
        </div>
      </el-header>
      <el-main>
        <el-card>
          <p class="hint">提示：下载链接和文件仅保留 7 天，请及时保存。</p>
          <el-table :data="downloads" v-loading="loading" border>
            <el-table-column prop="question_count" label="题目数量" width="120" />
            <el-table-column prop="is_vip" label="VIP生成" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.is_vip ? 'success' : 'info'">
                  {{ scope.row.is_vip ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="生成时间" width="200">
              <template #default="scope">
                {{ formatDateTime(scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="到期时间" width="200">
              <template #default="scope">
                {{ formatDateTime(scope.row.expires_at) }}
              </template>
            </el-table-column>
            <el-table-column label="试题组" min-width="160">
              <template #default="scope">
                <el-button
                  v-if="scope.row.question_pdf_url"
                  type="primary"
                  link
                  @click="handleDownload(scope.row.question_pdf_url, '试题组.pdf')"
                  :loading="downloading === scope.row.question_pdf_url"
                >
                  试题组.pdf
                </el-button>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="答案" min-width="160">
              <template #default="scope">
                <el-button
                  v-if="scope.row.answer_pdf_url"
                  type="primary"
                  link
                  @click="handleDownload(scope.row.answer_pdf_url, '答案.pdf')"
                  :loading="downloading === scope.row.answer_pdf_url"
                >
                  答案.pdf
                </el-button>
                <span v-else>--</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { downloadApi } from '@/api/download'
import { useUserStore } from '@/stores/user'

const downloads = ref([])
const loading = ref(false)
const downloading = ref(null)
const userStore = useUserStore()

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fetchDownloads = async () => {
  loading.value = true
  try {
    const res = await downloadApi.listDownloads()
    downloads.value = res.downloads || []
  } catch (error) {
    ElMessage.error(error.message || '获取下载记录失败')
  } finally {
    loading.value = false
  }
}

const handleDownload = async (url, filename) => {
  if (!url) {
    ElMessage.warning('下载链接不存在')
    return
  }

  if (!userStore.token) {
    ElMessage.error('请先登录')
    return
  }

  downloading.value = url
  try {
    // 获取完整URL
    // url格式可能是: /api/downloads/file/9/question
    // 如果已经是完整URL（http开头），直接使用
    // 否则使用相对路径（浏览器会自动使用当前域名）
    let fullUrl = url
    if (!url.startsWith('http')) {
      // 相对路径，浏览器会自动使用当前域名
      // 例如：/api/downloads/file/9/question -> https://educlient.adddesigngroup.com/api/downloads/file/9/question
      fullUrl = url
    }
    
    // 使用fetch下载文件，携带认证token
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `下载失败: ${response.status} ${response.statusText}`)
    }

    // 获取文件blob
    const blob = await response.blob()
    
    // 创建blob URL并触发下载
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 释放blob URL
    window.URL.revokeObjectURL(blobUrl)
    
    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error(error.message || '下载失败，请稍后重试')
  } finally {
    downloading.value = null
  }
}

onMounted(() => {
  fetchDownloads()
})
</script>

<style scoped>
.download-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-content h2 {
  margin: 0;
}

.hint {
  margin-bottom: 20px;
  color: #909399;
}
</style>
