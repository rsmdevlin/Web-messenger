import { useState, useEffect, useRef } from "react";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import AuthScreen from "./components/auth/AuthScreen";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatWindow from "./components/chat/ChatWindow";
import Settings from "./components/settings/Settings";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
  participants?: number[];
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesLoadedRef = useRef<Set<number>>(new Set());

  // AUTH CHECK
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // SOCKET.IO SETUP
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    newSocket.on("new_message", (data: Message) => {
      if (data && data.sender_id && data.chat_id === selectedChat?.id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    newSocket.on("typing", (data: { userId: number; username: string; chatId: number }) => {
      // Handle typing indicator
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, selectedChat?.id]);

  // LOAD CHATS
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadChats = async () => {
      try {
        const response = await api.get("/chats");
        if (response.data && Array.isArray(response.data)) {
          setChats(response.data);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
        setChats([]);
      }
    };

    loadChats();
    const interval = setInterval(loadChats, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // LOAD MESSAGES
  useEffect(() => {
    if (!selectedChat || !isAuthenticated) return;

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${selectedChat.id}`);
        if (response.data && Array.isArray(response.data)) {
          setMessages(response.data);
          messagesLoadedRef.current.add(selectedChat.id);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      }
    };

    loadMessages();

    if (socketRef.current) {
      socketRef.current.emit("join_chat", { chat_id: selectedChat.id });
    }
  }, [selectedChat?.id, isAuthenticated]);

  const handleSendMessage = async (content: string) => {
    if (!selectedChat || !user || !content.trim()) return;

    try {
      const response = await api.post("/messages", {
        chat_id: selectedChat.id,
        content: content.trim(),
      });

      if (response.data) {
        setMessages((prev) => [...prev, response.data]);
        if (socketRef.current) {
          socketRef.current.emit("send_message", {
            chat_id: selectedChat.id,
            content,
            sender_id: user.id,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleCreateChat = async (name: string) => {
    if (!name.trim()) return;
    try {
      const response = await api.post("/chats", { name: name.trim() });
      if (response.data) {
        setChats((prev) => [...prev, response.data]);
        setSelectedChat(response.data);
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      setIsAuthenticated(false);
      setUser(null);
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      setShowSettings(false);
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  if (showSettings && user) {
    return (
      <Settings
        user={user}
        onBack={() => setShowSettings(false)}
        onUserUpdate={setUser}
      />
    );
  }

  return (
    <div className="app">
      <div className="app-sidebar">
        {user && (
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
            onCreateChat={handleCreateChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            user={user}
            onLogout={handleLogout}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
      </div>
      <div className="app-main">
        {selectedChat && user ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            user={user}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="empty-chat">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path
                d="M32 16C23.2 16 16 23.2 16 32C16 35.3 17 38.4 18.8 41L16 48L23.3 45.2C26.1 47 29.3 48 32 48C40.8 48 48 40.8 48 32C48 23.2 40.8 16 32 16Z"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
            <p>Выберите чат</p>
            <span>или создайте новый</span>
          </div>
        )}
      </div>
    </div>
  );
}