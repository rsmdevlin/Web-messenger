import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import "./App.css";

interface User {
  id: number;
  username: string;
  email?: string;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
}

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  is_read: number;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, { reconnection: true });
    socketRef.current = socket;

    socket.on("connect", () => console.log("Socket connected"));
    socket.on("new-message", (data: any) => {
      if (data.chatId === selectedChat?.id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => socket.disconnect();
  }, [user, selectedChat]);

  const checkAuth = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      loadChats();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data || []);
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const res = await api.get(`/chats/${chatId}/messages`);
      setMessages(res.data || []);
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const res = await api.post(endpoint, formData);
      setUser(res.data);
      setFormData({ username: "", email: "", password: "" });
      loadChats();
    } catch (error: any) {
      alert(error.response?.data?.error || "Auth failed");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleCreateChat = async () => {
    const name = prompt("Enter chat name:");
    if (!name) return;

    try {
      const res = await api.post("/chats", { name, type: "private" });
      const newChat = res.data;
      setChats((prev) => [newChat, ...prev]);
      setSelectedChat(newChat);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create chat", error);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
    socketRef.current?.emit("join-chat", chat.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    try {
      const res = await api.post(`/chats/${selectedChat.id}/messages`, {
        content: messageInput,
        type: "text",
      });
      setMessages((prev) => [...prev, res.data]);
      setMessageInput("");
      socketRef.current?.emit("send-message", {
        chatId: selectedChat.id,
        content: messageInput,
        type: "text",
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  if (!user) {
    return (
      <div className="container auth-container">
        <div className="auth-box">
          <h1>Web Messenger</h1>
          <form onSubmit={handleAuth}>
            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            {isRegistering && (
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button type="submit">{isRegistering ? "Register" : "Login"}</button>
          </form>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setFormData({ username: "", email: "", password: "" });
            }}
          >
            {isRegistering ? "Already have an account? Login" : "Create account? Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container messenger-container">
      <div className="sidebar">
        <div className="user-header">
          <h2>Hi, {user.username}!</h2>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
        <button onClick={handleCreateChat} className="create-chat-btn">+ New Chat</button>
        <div className="chats-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? "active" : ""}`}
              onClick={() => handleSelectChat(chat)}
            >
              {chat.name}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <h3>{selectedChat.name}</h3>
            </div>
            <div className="messages-area">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.sender_id === user.id ? "sent" : "received"}`}>
                  <p className="message-content">{msg.content}</p>
                  <span className="message-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <p>Select a chat or create a new one to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}