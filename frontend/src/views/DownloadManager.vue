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
                <a
                  v-if="scope.row.question_pdf_url"
                  :href="scope.row.question_pdf_url"
                  target="_blank"
                  download="试题组.pdf"
                >
                  试题组.pdf
                </a>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="答案" min-width="160">
              <template #default="scope">
                <a
                  v-if="scope.row.answer_pdf_url"
                  :href="scope.row.answer_pdf_url"
                  target="_blank"
                  download="答案.pdf"
                >
                  答案.pdf
                </a>
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

const downloads = ref([])
const loading = ref(false)

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
