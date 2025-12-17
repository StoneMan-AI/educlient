import api from './index'

export const videoApi = {
  // 获取学习视频列表
  // params: { grade_id, subject_id, knowledge_point_id, limit, offset }
  getVideos(params = {}) {
    return api.get('/videos', { params })
  }
}


