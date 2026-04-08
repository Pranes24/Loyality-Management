// Axios instance — single source of truth for all API calls, auto-attaches JWT
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('loyalty_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('loyalty_token')
      localStorage.removeItem('loyalty_user')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || { error: 'Network error' })
  }
)

export default api
