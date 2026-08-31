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
  const handleCreateChat = () => {
    const name = prompt("Chat name:");
    if (name) onCreateChat(name);
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <div className="logo">WM</div>
        <div className="user-info">
          <div className="username">{user.username}</div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            ↪
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <button className="new-chat-btn" onClick={handleCreateChat}>
        + New Chat
      </button>

      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div className="empty-chats">No chats</div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? "active" : ""}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-avatar">
                {chat.name.charAt(0).toUpperCase()}
              </div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-meta">private</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}