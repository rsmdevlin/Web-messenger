import { useEffect, useState } from "react"
import axios from "axios"
import "./App.css"

interface User {
  id: number
  username: string
  email: string
}

interface Chat {
  id: number
  name: string
  type: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || "/api"

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`, { withCredentials: true })
      setUser(res.data)
      setShowLogin(false)
      loadChats()
    } catch {
      setShowLogin(true)
    } finally {
      setLoading(false)
    }
  }

  const loadChats = async () => {
    try {
      const res = await axios.get(`${API_URL}/chats`, { withCredentials: true })
      setChats(res.data)
    } catch (error) {
      console.error("Failed to load chats:", error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/auth/login`, { email, password }, { withCredentials: true })
      await checkAuth()
      setEmail("")
      setPassword("")
    } catch (error) {
      alert("Login failed")
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/auth/register`, { username, email, password }, { withCredentials: true })
      alert("Registration successful!")
      setIsRegistering(false)
      setEmail("")
      setPassword("")
      setUsername("")
    } catch (error) {
      alert("Registration failed")
    }
  }

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
      setUser(null)
      setShowLogin(true)
      setChats([])
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleCreateChat = async () => {
    const name = prompt("Enter chat name:")
    if (!name) return
    try {
      await axios.post(`${API_URL}/chats`, { name }, { withCredentials: true })
      await loadChats()
    } catch (error) {
      alert("Failed to create chat")
    }
  }

  if (loading) {
    return <div className="container"><p>Loading...</p></div>
  }

  if (showLogin) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Web Messenger</h1>
          {isRegistering ? (
            <>
              <h2>Create Account</h2>
              <form onSubmit={handleRegister}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit">Register</button>
              </form>
              <p>Already have account? <button type="button" className="link-btn" onClick={() => setIsRegistering(false)}>Login</button></p>
            </>
          ) : (
            <>
              <h2>Login</h2>
              <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit">Login</button>
              </form>
              <p>No account? <button type="button" className="link-btn" onClick={() => setIsRegistering(true)}>Register</button></p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="messenger">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button className="new-chat-btn" onClick={handleCreateChat}>+</button>
        </div>
        <div className="chat-list">
          {chats.map((chat) => (
            <div key={chat.id} className="chat-item">
              <div className="chat-name">{chat.name}</div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-info">{user?.username}</div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
      <div className="main-content">
        <div className="empty-state">
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    </div>
  )
}