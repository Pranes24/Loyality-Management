// Axios instance — single source of truth for all API calls
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data || { error: 'Network error' })
)

export default api
