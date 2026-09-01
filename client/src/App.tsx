import { useState, useEffect, useRef, useCallback } from "react";
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
  theme?: string;
  message_style?: string;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
  target_user_id?: number;
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
  username?: string;
  avatar?: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLoadedRef = useRef<boolean>(false);

  // AUTH CHECK
  const checkAuth = useCallback(async () => {
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
  }, []);

  // CHECK AUTH ON MOUNT
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // APPLY THEME
  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    }
  }, [user?.theme]);

  // SOCKET SETUP
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
      if (!data?.id || !selectedChat || data.chat_id !== selectedChat.id) return;

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        return exists ? prev : [...prev, data];
      });
    });

    newSocket.on("typing", (data: { username: string; isTyping: boolean }) => {
      if (data.username === user.username) return;

      if (data.isTyping) {
        setTypingUsers((prev) =>
          prev.includes(data.username) ? prev : [...prev, data.username]
        );
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== data.username));
      }
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.username, selectedChat?.id]);

  // LOAD CHATS
  const loadChats = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await api.get("/chats");
      if (response.data && Array.isArray(response.data)) {
        setChats(response.data);
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // LOAD MESSAGES - RESET FLAG WHEN CHAT CHANGES
  useEffect(() => {
    messagesLoadedRef.current = false;
    setMessages([]);
    setTypingUsers([]);

    if (!selectedChat || !isAuthenticated) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const response = await api.get(`/messages/${selectedChat.id}`);
        if (response.data && Array.isArray(response.data)) {
          setMessages(response.data);
          messagesLoadedRef.current = true;

          if (socketRef.current) {
            socketRef.current.emit("join_chat", { chat_id: selectedChat.id });
          }
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChat?.id, isAuthenticated]);

  // AUTO SCROLL
  useEffect(() => {
    if (messagesLoadedRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedChat || !user || !content.trim()) return;

    try {
      const response = await api.post("/messages", {
        chat_id: selectedChat.id,
        content: content.trim(),
      });

      if (response.data) {
        setMessages((prev) => [...prev, response.data]);
      }

      if (socketRef.current) {
        socketRef.current.emit("typing", {
          chat_id: selectedChat.id,
          username: user.username,
          isTyping: false,
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedChat || !user || !socketRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketRef.current.emit("typing", {
      chat_id: selectedChat.id,
      username: user.username,
      isTyping,
    });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("typing", {
            chat_id: selectedChat.id,
            username: user.username,
            isTyping: false,
          });
        }
      }, 3000);
    }
  };

  const handleCreateChat = async (name: string, targetUserId?: number) => {
    if (!name.trim()) return;

    try {
      const response = await api.post("/chats", {
        name: name.trim(),
        targetUserId,
      });

      if (response.data) {
        setChats((prev) => [response.data, ...prev]);
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
    return <AuthScreen onAuthSuccess={checkAuth} />;
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
      <div className={`app-sidebar ${sidebarVisible ? "visible" : ""}`}>
        {user && (
          <ChatSidebar
            chats={chats}
            selectedChat={selectedChat}
            onSelectChat={(chat) => {
              setSelectedChat(chat);
              setSidebarVisible(false);
            }}
            onCreateChat={handleCreateChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            user={user}
            onLogout={handleLogout}
            onOpenSettings={() => setShowSettings(true)}
            onTyping={handleTyping}
          />
        )}
      </div>

      <div className="app-main">
        {selectedChat && user ? (
          <>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              title="Back to chats"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 16L6 10L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <ChatWindow
              chat={selectedChat}
              messages={messages}
              user={user}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              typingUsers={typingUsers}
              messagesEndRef={messagesEndRef}
              isLoadingMessages={loadingMessages}
            />
          </>
        ) : (
          <div className="empty-chat">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle
                cx="32"
                cy="32"
                r="30"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.2"
              />
              <path
                d="M32 16C23.2 16 16 23.2 16 32C16 35.3 17 38.4 18.8 41L16 48L23.3 45.2C26.1 47 29.3 48 32 48C40.8 48 48 40.8 48 32C48 23.2 40.8 16 32 16Z"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
            <p>Select a chat</p>
            <span>to start messaging</span>
          </div>
        )}
      </div>
    </div>
  );
}
