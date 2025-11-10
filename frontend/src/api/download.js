import api from './index'

export const downloadApi = {
  listDownloads() {
    return api.get('/downloads')
  }
}
