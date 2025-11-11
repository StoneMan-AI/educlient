<template>
  <div class="user-actions">
    <el-button v-if="!userStore.isLoggedIn" @click="$router.push('/login')">登录/注册</el-button>
    <el-dropdown v-else @command="handleCommand">
      <span class="user-info">
        {{ userStore.userInfo?.phone || '用户' }}
        <el-icon><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="profile">个人中心</el-dropdown-item>
          <el-dropdown-item command="downloads">下载管理</el-dropdown-item>
          <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const handleCommand = async (command) => {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'downloads') {
    router.push('/downloads')
  } else if (command === 'logout') {
    userStore.logout()
    ElMessage.success('已退出登录')
    router.replace('/')
  }
}
</script>

<style scoped>
.user-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
