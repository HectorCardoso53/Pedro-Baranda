import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Erro na requisição'
    if (error.response?.status === 401) {
      auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(new Error(message))
  }
)

export default api
