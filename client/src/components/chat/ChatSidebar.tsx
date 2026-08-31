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
      <div className="list-header">
        <h1>РЎРѕРѕР±С‰РµРЅРёСЏ</h1>
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="var(--text-muted)" strokeWidth="1.4"/>
            <path d="M10.5 10.5L14 14" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="РџРѕРёСЃРє"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="rows">
        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <p>РќРµС‚ С‡Р°С‚РѕРІ</p>
            <button onClick={handleCreateChat} className="new-chat-action">
              + РЎРѕР·РґР°С‚СЊ С‡Р°С‚
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`row-wrap ${selectedChat?.id === chat.id ? "active" : ""}`}
            >
              <div
                className="row"
                onClick={() => onSelectChat(chat)}
              >
                <div className="avatar">
                  <svg viewBox="0 0 50 50" width="50" height="50">
                    <circle cx="25" cy="25" r="23" stroke="var(--accent)" strokeWidth="1.4" fill="none" opacity="0.55"/>
                    <path d="M6 20 L44 30 M10 34 L40 16" stroke="var(--accent)" strokeWidth="1" opacity="0.35"/>
                    <text x="25" y="30" textAnchor="middle" fontFamily="Space Grotesk" fontSize="15" fontWeight="600" fill="var(--accent)">
                      {chat.name.charAt(0).toUpperCase()}
                    </text>
                  </svg>
                  <div className="online-dot"></div>
                </div>
                <div className="row-body">
                  <div className="row-top">
                    <span className="row-name">{chat.name}</span>
                    <span className="row-time">12:41</span>
                  </div>
                  <div className="row-bottom">
                    <span className="row-preview">РџРѕСЃР»РµРґРЅРµРµ СЃРѕРѕР±С‰РµРЅРёРµ</span>
                    <span className="badge">2</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-name">{user.username}</div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1 8H11M11 8L8 5M11 8L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 1H13C14.1 1 15 1.9 15 3V13C15 14.1 14.1 15 13 15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}