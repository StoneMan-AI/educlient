<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <h2>{{ isLogin ? '登录' : '注册' }}</h2>
      </template>
      
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item v-if="!isLogin" label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading" style="width: 100%">
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
        
        <el-form-item>
          <div class="form-footer">
            <el-link type="primary" @click="toggleMode">
              {{ isLogin ? '还没有账号？立即注册' : '已有账号？立即登录' }}
            </el-link>
            <el-link v-if="isLogin" type="primary" @click="$router.push('/forgot-password')" style="margin-left: 20px;">
              忘记密码？
            </el-link>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isLogin = ref(true)
const loading = ref(false)
const formRef = ref(null)

const form = ref({
  phone: '',
  password: '',
  confirmPassword: ''
})

// 自定义验证规则：确认密码必须与密码相同
const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  form.value = { phone: '', password: '', confirmPassword: '' }
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      if (isLogin.value) {
        await userStore.login(form.value.phone, form.value.password)
        ElMessage.success('登录成功')
      } else {
        // 注册时不需要验证码
        await userStore.register(form.value.phone, form.value.password)
        ElMessage.success('注册成功')
      }
      
      // 获取用户信息
      await userStore.fetchUserInfo()
      
      // 跳转
      const redirect = route.query.redirect || '/'
      router.push(redirect)
    } catch (error) {
      ElMessage.error(error.response?.data?.message || (isLogin.value ? '登录失败' : '注册失败'))
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
}

.login-card {
  width: 400px;
}

.login-card h2 {
  margin: 0;
  text-align: center;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

</style>

