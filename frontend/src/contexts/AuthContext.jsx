// Auth context — stores JWT token + user profile, provides login/logout
import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'loyalty_token'
const USER_KEY  = 'loyalty_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })

  function login(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  const isAuthenticated  = !!token && !!user
  const isSuperAdmin     = user?.role === 'super_admin'
  const isOrgAdmin       = user?.role === 'org_admin'

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated, isSuperAdmin, isOrgAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
