<template>
  <div class="forgot-password-page">
    <el-card class="forgot-card">
      <template #header>
        <div class="header-content">
          <el-button @click="$router.push('/login')" :icon="ArrowLeft" text>返回登录</el-button>
          <h2>找回密码</h2>
        </div>
      </template>
      
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="验证手机号" />
        <el-step title="输入验证码" />
        <el-step title="设置新密码" />
      </el-steps>
      
      <el-divider />
      
      <!-- 步骤1：验证手机号 -->
      <el-form v-if="currentStep === 0" :model="form" :rules="phoneRules" ref="phoneFormRef" label-width="100px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入注册时的手机号" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCheckPhone" :loading="checkingPhone" style="width: 100%">
            下一步
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 步骤2：输入验证码 -->
      <el-form v-if="currentStep === 1" :model="form" :rules="codeRules" ref="codeFormRef" label-width="100px">
        <el-form-item label="手机号">
          <el-input v-model="form.phone" disabled />
        </el-form-item>
        <el-form-item label="验证码" prop="code">
          <div class="code-input">
            <el-input v-model="form.code" placeholder="请输入验证码" />
            <el-button @click="sendCode" :disabled="codeCountdown > 0">
              {{ codeCountdown > 0 ? `${codeCountdown}秒后重试` : '重新发送' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleVerifyCode" :loading="verifyingCode" style="width: 100%">
            下一步
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 步骤3：设置新密码 -->
      <el-form v-if="currentStep === 2" :model="form" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="form.newPassword" 
            type="password" 
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleResetPassword" :loading="resettingPassword" style="width: 100%">
            完成
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { userApi } from '@/api/user'
import { ElMessage } from 'element-plus'

const router = useRouter()

const currentStep = ref(0)
const checkingPhone = ref(false)
const verifyingCode = ref(false)
const resettingPassword = ref(false)
const codeCountdown = ref(0)

const phoneFormRef = ref(null)
const codeFormRef = ref(null)
const passwordFormRef = ref(null)

const form = ref({
  phone: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

// 自定义验证规则：确认密码必须与新密码相同
const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const phoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const codeRules = {
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 步骤1：验证手机号
const handleCheckPhone = async () => {
  if (!phoneFormRef.value) return
  
  await phoneFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    checkingPhone.value = true
    try {
      // 调用API验证手机号是否存在
      await userApi.checkPhoneExists(form.value.phone)
      
      // 手机号存在，发送验证码
      await sendCode()
      
      // 进入下一步
      currentStep.value = 1
      ElMessage.success('验证码已发送，请查收')
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '验证失败，请检查手机号是否正确')
    } finally {
      checkingPhone.value = false
    }
  })
}

// 发送验证码
const sendCode = async () => {
  try {
    await userApi.sendResetPasswordCode(form.value.phone)
    ElMessage.success('验证码已发送')
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送验证码失败')
  }
}

// 步骤2：验证验证码
const handleVerifyCode = async () => {
  if (!codeFormRef.value) return
  
  await codeFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    verifyingCode.value = true
    try {
      // 验证验证码
      await userApi.verifyResetPasswordCode(form.value.phone, form.value.code)
      
      // 验证成功，进入下一步
      currentStep.value = 2
      ElMessage.success('验证码正确')
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '验证码错误')
    } finally {
      verifyingCode.value = false
    }
  })
}

// 步骤3：重置密码
const handleResetPassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    resettingPassword.value = true
    try {
      await userApi.resetPassword({
        phone: form.value.phone,
        code: form.value.code,
        new_password: form.value.newPassword
      })
      
      ElMessage.success('密码重置成功，请使用新密码登录')
      
      // 跳转到登录页
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '重置密码失败')
    } finally {
      resettingPassword.value = false
    }
  })
}
</script>

<style scoped>
.forgot-password-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  padding: 20px;
}

.forgot-card {
  width: 500px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-content h2 {
  margin: 0;
  flex: 1;
  text-align: center;
}

.code-input {
  display: flex;
  gap: 10px;
}

.code-input .el-input {
  flex: 1;
}
</style>

