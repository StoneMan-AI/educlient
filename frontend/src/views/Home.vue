<template>
  <div class="home">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>试题图片组合网站</h1>
          <div class="user-actions">
            <el-button v-if="!userStore.isLoggedIn" @click="$router.push('/login')">登录/注册</el-button>
            <el-dropdown v-else>
              <span class="user-info">
                {{ userStore.userInfo?.phone }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="$router.push('/profile')">个人中心</el-dropdown-item>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>
      <el-main>
        <div class="home-content">
          <el-card class="welcome-card">
            <h2>欢迎使用试题图片组合系统</h2>
            <p>通过年级、学科、知识点查询试题，组合生成专项练习题组</p>
            <el-button type="primary" size="large" @click="$router.push('/search')">
              开始查询试题
            </el-button>
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
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
  location.reload()
}
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

