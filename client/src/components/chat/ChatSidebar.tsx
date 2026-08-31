import { useState } from "react";
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
}: Props) {
  const [isSearching, setIsSearching] = useState(false);

  const handleCreateChat = () => {
    const name = prompt("Имя чата:");
    if (name) onCreateChat(name);
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h1>Сообщения</h1>
        <button className="create-chat-btn" onClick={handleCreateChat} title="Create chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={`search-box ${isSearching ? "focused" : ""}`}>
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Поиск"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsSearching(true)}
          onBlur={() => setIsSearching(false)}
          className="search-input"
        />
      </div>

      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <p>Нет чатов</p>
            <button onClick={handleCreateChat} className="new-chat-btn">
              + Создать чат
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-row ${selectedChat?.id === chat.id ? "active" : ""}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-avatar">
                <div className="avatar-letter">{chat.name.charAt(0).toUpperCase()}</div>
                <div className="online-dot"></div>
              </div>
              
              <div className="chat-body">
                <div className="chat-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">12:41</span>
                </div>
                <div className="chat-bottom">
                  <span className="chat-preview">Последнее сообщение</span>
                  <span className="unread-badge">2</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user.username}</div>
            <div className="user-status">online</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1 8H11M11 8L8 5M11 8L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 1H13C14.1 1 15 1.9 15 3V13C15 14.1 14.1 15 13 15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}