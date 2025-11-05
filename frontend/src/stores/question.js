import { defineStore } from 'pinia'

export const useQuestionStore = defineStore('question', {
  state: () => ({
    selectedQuestions: [], // 已选中的题目ID数组
    currentQuestion: null, // 当前查看的题目
    currentFilters: {
      gradeId: null,
      subjectId: null,
      knowledgePointId: null
    },
    downloadedQuestions: [] // 已下载的题目ID（当前知识点）
  }),
  
  getters: {
    selectedCount: (state) => state.selectedQuestions.length,
    canSelectMore: (state) => state.selectedQuestions.length < 15,
    isSelected: (state) => (questionId) => {
      return state.selectedQuestions.includes(questionId)
    },
    isDownloaded: (state) => (questionId) => {
      return state.downloadedQuestions.includes(questionId)
    }
  },
  
  actions: {
    toggleSelect(questionId) {
      const index = this.selectedQuestions.indexOf(questionId)
      if (index > -1) {
        this.selectedQuestions.splice(index, 1)
      } else if (this.selectedQuestions.length < 15) {
        this.selectedQuestions.push(questionId)
      }
    },
    
    clearSelection() {
      this.selectedQuestions = []
    },
    
    setCurrentQuestion(question) {
      this.currentQuestion = question
    },
    
    setFilters(filters) {
      this.currentFilters = { ...this.currentFilters, ...filters }
    },
    
    setDownloadedQuestions(questionIds) {
      this.downloadedQuestions = questionIds
    }
  }
})

