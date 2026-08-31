import { useState, useMemo } from "react";
import CreateChatModal from "./CreateChatModal";
import "./ChatSidebar.css";

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  avatar?: string;
}

interface Props {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onCreateChat: (name: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  onCreateChat,
  searchQuery,
  onSearchChange,
  user,
  onLogout,
  onOpenSettings,
}: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.name.startsWith("@")
    );
  }, [chats, searchQuery]);

  const handleCreateChat = (name: string) => {
    onCreateChat(name);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h1>Сообщения</h1>
          <button
            className="create-chat-btn"
            onClick={() => setShowCreateModal(true)}
            title="Создать чат"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V16M2 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={`search-box ${isSearchFocused ? "focused" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Поиск или @username"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        <div className="chats-list">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-row ${selectedChat?.id === chat.id ? "active" : ""}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="chat-avatar">
                  <div className="avatar-letter">{chat.name[0].toUpperCase()}</div>
                  <div className="online-dot" />
                </div>
                <div className="chat-body">
                  <div className="chat-top">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="chat-bottom">
                    <span className="chat-preview">Нажмите для открытия</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>Нет чатов</p>
              <button
                className="new-chat-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Создать чат
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            <div className="user-info">
              <div className="user-name">@{user.username}</div>
              <div className="user-status">Онлайн</div>
            </div>
          </div>
          <div className="footer-buttons">
            <button
              className="footer-btn settings-btn"
              onClick={onOpenSettings}
              title="Параметры"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="3" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
                <circle cx="9" cy="15" r="1" fill="currentColor" />
              </svg>
            </button>
            <button className="footer-btn logout-btn" onClick={onLogout} title="Выход">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M7 2H4C3.44772 2 3 2.44772 3 3V15C3 15.5523 3.44772 16 4 16H7M11 6L15 9M15 9L11 12M15 9H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateChat}
      />
    </>
  );
}