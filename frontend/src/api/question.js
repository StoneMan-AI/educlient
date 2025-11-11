import api from './index'

export const questionApi = {
  // 获取年级列表
  getGrades() {
    return api.get('/grades')
  },
  
  // 获取学科列表
  getSubjects(gradeId) {
    return api.get(`/subjects?grade_id=${gradeId}`)
  },
  
  // 获取知识点列表
  getKnowledgePoints(gradeId, subjectId) {
    return api.get(`/knowledge-points?grade_id=${gradeId}&subject_id=${subjectId}`)
  },

  // 学段随机知识点
  getRandomKnowledgePointsByStage(stage, limit = 10) {
    return api.get(`/knowledge-points/random-by-stage`, { params: { stage, limit } })
  },

  // 获取题型列表
  getQuestionTypes() {
    return api.get('/questions/types')
  },

  // 获取难度列表
  getDifficultyLevels() {
    return api.get('/questions/difficulties')
  },
  
  // 查询试题
  searchQuestions(params) {
    return api.get('/questions/search', { params })
  },
  
  // 获取试题详情
  getQuestionDetail(id) {
    return api.get(`/questions/${id}`)
  },
  
  // 查看答案（触发支付）
  viewAnswer(questionId) {
    return api.post(`/questions/${questionId}/view-answer`)
  },
  
  // 一键生成试题组
  generateQuestionGroup(params) {
    return api.post('/questions/generate-group', params)
  },
  
  // 下载试题组（生成下载记录）
  downloadQuestionGroup(questionIds, orderNo) {
    const payload = { question_ids: questionIds }
    if (orderNo) {
      payload.order_no = orderNo
    }
    return api.post('/questions/download-group', payload)
  },
  
  // 获取用户已下载的题目
  getDownloadedQuestions(knowledgePointId) {
    return api.get(`/questions/downloaded?knowledge_point_id=${knowledgePointId}`)
  },
  
  // 重置已下载题目标记
  resetDownloadedQuestions(knowledgePointId) {
    return api.post(`/questions/reset-downloaded`, { knowledge_point_id: knowledgePointId })
  },
  
  // 收藏/取消收藏题目
  toggleFavorite(questionId) {
    return api.post(`/questions/${questionId}/favorite`)
  }
}

