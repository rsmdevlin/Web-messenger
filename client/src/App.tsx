import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import AuthScreen from "./components/auth/AuthScreen";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatWindow from "./components/chat/ChatWindow";
import Settings from "./components/settings/Settings";
import { useSwipe } from "./hooks/useSwipe";
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
  displayName?: string;
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
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLoadedRef = useRef<boolean>(false);
  const swipeHandlers = useSwipe({
    onSwipeRight: () => {
      if (selectedChat) {
        setSelectedChat(null);
        setSearchQuery("");
      }
    },
    onSwipeLeft: () => {
      // Reserved for future navigation
    },
  });

  // DETECT MOBILE/DESKTOP ON RESIZE
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // SOCKET SETUP - Setup once on auth, keep connection alive
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
      console.log("✅ Socket connected, ID:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    newSocket.on("error", (error: any) => {
      console.error("⚠️ Socket error:", error);
    });

    newSocket.on("new_message", (data: Message) => {
      console.log("📨 New message received:", data);
      if (!data?.id) {
        console.warn("⚠️ Message missing ID:", data);
        return;
      }

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) {
          console.warn("⚠️ Message already exists, skipping:", data.id);
          return prev;
        }
        console.log("✅ Adding new message to state:", data.id);
        return [...prev, data];
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
  }, [isAuthenticated, user?.username]);

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
        console.log("📥 Loading messages for chat:", selectedChat.id);
        const response = await api.get(`/messages/${selectedChat.id}`);
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ Loaded ${response.data.length} messages`);
          setMessages(response.data);
          messagesLoadedRef.current = true;

          if (socketRef.current) {
            console.log("🔌 Joining chat room:", selectedChat.id);
            console.log("🔌 Socket connected?", socketRef.current.connected);
            socketRef.current.emit("join_chat", { chat_id: selectedChat.id }, (ack: any) => {
              console.log("🔌 join_chat acknowledged:", ack);
            });
          } else {
            console.warn("⚠️ Socket not available when joining chat");
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
      console.log("📤 Sending message to chat:", selectedChat.id);
      console.log("📤 User ID:", user.id);
      console.log("📤 Socket connected?", socketRef.current?.connected);

      const response = await api.post("/messages", {
        chat_id: selectedChat.id,
        content: content.trim(),
      });

      if (response.data) {
        console.log("✅ Message sent successfully:", response.data);
        console.log("✅ Message ID:", response.data.id, "Sender ID:", response.data.sender_id);
        setMessages((prev) => [...prev, response.data]);
      }

      if (socketRef.current) {
        console.log("📢 Broadcasting typing stop");
        socketRef.current.emit("typing", {
          chat_id: selectedChat.id,
          username: user.username,
          isTyping: false,
        });
      }
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedChat || !user || !socketRef.current) {
      console.warn("⚠️ Cannot send typing event - missing dependencies", {
        selectedChat: !!selectedChat,
        user: !!user,
        socket: !!socketRef.current,
      });
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    console.log(`📝 Sending typing event: ${isTyping ? "typing" : "stopped"}`);
    socketRef.current.emit("typing", {
      chat_id: selectedChat.id,
      username: user.username,
      isTyping,
    });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          console.log("📝 Auto-stopping typing indicator");
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
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app">
      {/* MOBILE: Show either sidebar or chat */}
      {isMobile ? (
        <>
          {!selectedChat ? (
            /* Mobile: Chat List */
            <div className="app-mobile-sidebar">
              {user && (
                <ChatSidebar
                  chats={chats}
                  selectedChat={selectedChat}
                  onSelectChat={(chat) => {
                    setSelectedChat(chat);
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
          ) : (
            /* Mobile: Chat Window */
            <div
              className="app-mobile-chat"
              onTouchStart={swipeHandlers.handleTouchStart}
              onTouchEnd={swipeHandlers.handleTouchEnd}
            >
              <button
                className="mobile-back-btn"
                onClick={() => {
                  setSelectedChat(null);
                  setSearchQuery("");
                }}
                title="Back to chats"
                aria-label="Back to chats"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M12 16L6 10L12 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {user && (
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
              )}
            </div>
          )}
        </>
      ) : (
        /* DESKTOP: Show sidebar + chat side by side */
        <div className="app-desktop-layout">
          <div className="app-desktop-sidebar">
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
                onTyping={handleTyping}
              />
            )}
          </div>

          <div className="app-desktop-main">
            {selectedChat && user ? (
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
                <h2>Select a chat</h2>
                <p>to start messaging</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
