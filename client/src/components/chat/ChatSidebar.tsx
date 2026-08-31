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

  return (
    <>
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h1>Messages</h1>
          <button
            className="create-chat-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create chat"
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
            placeholder="Search or @username"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
          />
        </div>

        {/* Search results dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="search-result-item"
                onClick={() => handleSelectSearchResult(result)}
              >
                <div className="result-avatar">
                  {result.avatar ? (
                    <img src={result.avatar} alt={result.username} />
                  ) : (
                    result.username[0].toUpperCase()
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
                    <span className="chat-preview">Click to open</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No chats</p>
              {!searchQuery && (
                <button
                  className="new-chat-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create chat
                </button>
              )}
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
              <div className="user-status">Online</div>
            </div>
          </div>
          <div className="footer-buttons">
            <button
              className="footer-btn settings-btn"
              onClick={onOpenSettings}
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="3" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
                <circle cx="9" cy="15" r="1" fill="currentColor" />
              </svg>
            </button>
            <button className="footer-btn logout-btn" onClick={onLogout} title="Logout">
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
