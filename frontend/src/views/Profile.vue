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
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await userStore.fetchUserInfo()
  }
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
</style>

