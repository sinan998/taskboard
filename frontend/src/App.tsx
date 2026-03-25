import { useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { Board } from './components/Board'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'))

  function handleLogin() {
    setIsLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Board onLogout={handleLogout} />
}
