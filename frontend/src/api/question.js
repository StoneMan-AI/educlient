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
  
  // 下载试题组（返回可能是JSON需要支付，或PDF文件）
  async downloadQuestionGroup(questionIds) {
    try {
      // 先尝试作为JSON获取（检查是否需要支付）
      const response = await fetch('/api/questions/download-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ question_ids: questionIds })
      })
      
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        return data
      } else {
        // 返回的是PDF文件
        const blob = await response.blob()
        return blob
      }
    } catch (error) {
      throw error
    }
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

