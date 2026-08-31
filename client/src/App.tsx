import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import "./App.css";
import AuthScreen from "./components/auth/AuthScreen";
import MainLayout from "./components/layout/MainLayout";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatWindow from "./components/chat/ChatWindow";

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
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
      // BUGFIX: РџСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РґР»СЏ С‚РµРєСѓС‰РµРіРѕ С‡Р°С‚Р°
      if (data.chatId === selectedChat?.id) {
        // РЈР±РµР¶РґР°РµРјСЃСЏ С‡С‚Рѕ РїСЂРёС€Р»Рѕ РІР°Р»РёРґРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ СЃ sender_id
        if (data.sender_id) {
          setMessages((prev) => [...prev, data]);
        }
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
      // BUGFIX: Р“Р°СЂР°РЅС‚РёСЂСѓРµРј С‡С‚Рѕ РІСЃРµ СЃРѕРѕР±С‰РµРЅРёСЏ РёРјРµСЋС‚ РїСЂР°РІРёР»СЊРЅС‹Р№ sender_id РёР· API
      setMessages(res.data || []);
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
    socketRef.current?.emit("join-chat", chat.id);
  };

  const handleCreateChat = async (name: string) => {
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

  const handleSendMessage = async (content: string) => {
    if (!selectedChat || !content.trim() || !user) return;
    try {
      // BUGFIX: API РґРѕР»Р¶РµРЅ РІРµСЂРЅСѓС‚СЊ message СЃ РїСЂР°РІРёР»СЊРЅС‹Рј sender_id
      const res = await api.post(`/chats/${selectedChat.id}/messages`, {
        content,
        type: "text",
      });

      // РџСЂРѕРІРµСЂСЏРµРј С‡С‚Рѕ response СЃРѕРґРµСЂР¶РёС‚ РІР°Р»РёРґРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
      if (res.data && res.data.sender_id) {
        setMessages((prev) => [...prev, res.data]);

        // РћС‚РїСЂР°РІР»СЏРµРј С‡РµСЂРµР· Socket С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕРіРѕ СЃРѕР·РґР°РЅРёСЏ РІ Р‘Р”
        socketRef.current?.emit("send-message", {
          chatId: selectedChat.id,
          content,
          type: "text",
          sender_id: user.id, // РЇРІРЅРѕ РїРµСЂРµРґР°РµРј sender_id
          message_id: res.data.id,
        });
      }
    } catch (error) {
      console.error("Failed to send message", error);
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

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        background: "var(--bg)",
      }}>
        <div style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={checkAuth} />;
  }

  return (
    <MainLayout
      sidebar={
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onCreateChat={handleCreateChat}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          onLogout={handleLogout}
        />
      }
      main={
        selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            user={user}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--text-muted)",
          }}>
            Select a chat to start messaging
          </div>
        )
      }
    />
  );
}