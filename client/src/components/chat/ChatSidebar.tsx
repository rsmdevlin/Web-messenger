import { useState, useMemo, useRef } from "react";
import CreateChatModal from "./CreateChatModal";
import "./ChatSidebar.css";
import axios from "axios";

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
  target_user_id?: number;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  avatar?: string;
}

interface User {
  id: number;
  username: string;
  avatar?: string;
  email?: string;
  displayName?: string;
}

interface SearchResult {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
}

interface Props {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onCreateChat: (name: string, targetUserId?: number) => void;
  onCreateGroup?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onTyping?: (isTyping: boolean) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  onCreateChat,
  onCreateGroup,
  searchQuery,
  onSearchChange,
  user,
  onLogout,
  onOpenSettings,
  onTyping,
}: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return chats;
    }
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.name.startsWith("@")
    );
  }, [chats, searchQuery]);

  const handleSearchChange = async (query: string) => {
    onSearchChange(query);
    onTyping?.(query.length > 0);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await api.get(`/user/search/${query}`);
          setSearchResults(response.data || []);
        } catch (err) {
          console.error("Search error:", err);
          setSearchResults([]);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const chatName = result.displayName || `@${result.username}`;
    onCreateChat(chatName, result.id);
    onSearchChange("");
    setSearchResults([]);
  };

  const handleCreateChat = (name: string) => {
    onCreateChat(name);
    setShowCreateModal(false);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateMessage = (text?: string, maxLength: number = 40) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <>
      <div className="chat-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            <h1>Messages</h1>
          </div>
          <button
            className="create-chat-btn"
            onClick={() => setShowCreateModal(true)}
            title="New chat"
            aria-label="Create new chat"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2V16M2 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="create-group-btn"
            onClick={onCreateGroup}
            title="New group"
            aria-label="Create new group"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 7C11.1 7 12 6.1 12 5C12 3.9 11.1 3 10 3M3 9C4.1 9 5 8.1 5 7M2 14C2 12 3.5 11 6 11C8.5 11 10 12 10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 9C11.1 9 12 8.1 12 7M11 14C11 12.5 12.2 11.5 14 11.5C15.8 11.5 17 12.5 17 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Search Container */}
        <div className="search-container">
          <div className={`search-box ${isSearchFocused ? "focused" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search chats or @username"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              aria-label="Search chats"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results" role="listbox">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="search-result-item"
                  onClick={() => handleSelectSearchResult(result)}
                  role="option"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSelectSearchResult(result);
                  }}
                >
                  <div className="result-avatar">
                    {result.avatar ? (
                      <img src={result.avatar} alt={result.username} />
                    ) : (
                      getAvatarInitials(result.displayName || result.username)
                    )}
                  </div>
                  <div className="result-info">
                    <div className="result-name">{result.displayName || result.username}</div>
                    <div className="result-username">@{result.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chats List */}
        <div className="chats-list" role="list">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat, index) => (
              <div
                key={chat.id}
                className={`chat-row ${selectedChat?.id === chat.id ? "active" : ""}`}
                onClick={() => onSelectChat(chat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectChat(chat);
                }}
                role="listitem"
                tabIndex={0}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Avatar */}
                <div className="chat-avatar">
                  <div className="avatar-circle">
                    {chat.avatar ? (
                      <img src={chat.avatar} alt={chat.name} />
                    ) : (
                      getAvatarInitials(chat.name)
                    )}
                  </div>
                  <div className="online-indicator" />
                </div>

                {/* Chat Info */}
                <div className="chat-body">
                  {/* Top Row: Name + Time */}
                  <div className="chat-header">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{formatTime(chat.last_message_time || chat.created_at)}</span>
                  </div>

                  {/* Bottom Row: Message Preview + Badge */}
                  <div className="chat-footer">
                    <span className="chat-preview">
                      {truncateMessage(chat.last_message || "No messages yet")}
                    </span>
                    {(chat.unread_count || 0) > 0 && (
                      <span className="unread-badge">{chat.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                <path
                  d="M24 14C18.5 14 14 18.5 14 24C14 27.2 15.6 30 18 31.8L16 36L21 33C22 33.3 23 33.5 24 33.5C29.5 33.5 34 29 34 23.5C34 18 29.5 14 24 14Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.3"
                />
              </svg>
              <p>No chats yet</p>
              <span className="empty-hint">Start a conversation to get began</span>
              {!searchQuery && (
                <button
                  className="start-chat-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  New Chat
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                getAvatarInitials(user.displayName || user.username)
              )}
            </div>
            <div className="user-info">
              <div className="user-name">@{user.username}</div>
              <div className="user-status">Online</div>
            </div>
          </div>
          <div className="footer-buttons">
            <button
              className="footer-btn settings-btn"
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="3" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
                <circle cx="9" cy="15" r="1" fill="currentColor" />
              </svg>
            </button>
            <button
              className="footer-btn logout-btn"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
            >
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
