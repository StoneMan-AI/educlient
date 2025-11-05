<template>
  <el-dialog
    v-model="dialogVisible"
    title="查看答案"
    width="80%"
    @close="handleClose"
  >
    <div class="answer-content">
      <img 
        v-if="question?.answer_image_url" 
        :src="question.answer_image_url" 
        alt="答案"
        class="answer-image"
      />
      <div v-else class="no-answer">暂无答案图片</div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  question: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'paid'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.answer-content {
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.answer-image {
  max-width: 100%;
  max-height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.no-answer {
  color: #999;
  font-size: 16px;
}
</style>

