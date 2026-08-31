import { useState, useEffect } from "react";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import AuthScreen from "./components/auth/AuthScreen";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatWindow from "./components/chat/ChatWindow";
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  // Проверить авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Инициализировать Socket.IO
  useEffect(() => {
    if (!isAuthenticated) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    newSocket.on("new_message", (data: Message) => {
      if (data.sender_id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Загрузить чаты
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadChats = async () => {
      try {
        const response = await api.get("/chats");
        setChats(response.data);
      } catch (err) {
        console.error("Failed to load chats", err);
      }
    };

    loadChats();
  }, [isAuthenticated]);

  // Загрузить сообщения при выборе чата
  useEffect(() => {
    if (!selectedChat) return;

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${selectedChat.id}`);
        setMessages(response.data);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    loadMessages();

    if (socket) {
      socket.emit("join_chat", { chat_id: selectedChat.id });
    }
  }, [selectedChat]);

  const handleSendMessage = async (content: string) => {
    if (!selectedChat || !user) return;

    try {
      const response = await api.post("/messages", {
        chat_id: selectedChat.id,
        content,
      });

      if (response.data && response.data.sender_id) {
        setMessages((prev) => [...prev, response.data]);
      }

      if (socket) {
        socket.emit("send_message", {
          chat_id: selectedChat.id,
          content,
          sender_id: user.id,
        });
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleCreateChat = async (name: string) => {
    try {
      const response = await api.post("/chats", { name });
      setChats((prev) => [...prev, response.data]);
    } catch (err) {
      console.error("Failed to create chat", err);
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
      console.error("Failed to logout", err);
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
            <p>Выберите чат для начала</p>
          </div>
        )}
      </div>
    </div>
  );
}