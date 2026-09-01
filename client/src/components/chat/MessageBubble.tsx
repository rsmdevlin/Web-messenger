import { useState } from "react";
import MessageContextMenu from "./MessageContextMenu";
import "./MessageBubble.css";

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
  media_data?: {
    filename: string;
    type: string;
    size: number;
    preview: string;
  };
}

interface Props {
  message: Message;
  isOwn: boolean;
  onDelete?: (messageId: number) => void;
  onReact?: (messageId: number, emoji: string) => void;
}

export default function MessageBubble({ message, isOwn, onDelete, onReact }: Props) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [reactions, setReactions] = useState<Map<string, number>>(new Map());

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isRead = message.is_read === 1;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleLongPress = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setContextMenuPos({ x: touch.clientX, y: touch.clientY });
    setShowContextMenu(true);
  };

  const commonMenuItems = [
    { label: "Copy", icon: "📋", action: () => {
      navigator.clipboard.writeText(message.content);
    }},
    { label: "React", icon: "😊", action: () => {
      const emoji = prompt("Enter emoji:");
      if (emoji && onReact) {
        onReact(message.id, emoji);
        const newReactions = new Map(reactions);
        newReactions.set(emoji, (newReactions.get(emoji) || 0) + 1);
        setReactions(newReactions);
      }
    }},
  ];

  const menuItems = isOwn
    ? [
        ...commonMenuItems,
        { divider: true },
        { label: "Delete", icon: "🗑️", action: () => {
          if (onDelete) onDelete(message.id);
        }, danger: true },
      ]
    : commonMenuItems;

  return (
    <div className={`message-group ${isOwn ? "own" : "other"}`} onContextMenu={handleContextMenu} onTouchEnd={handleLongPress}>
      {!isOwn && message.avatar && (
        <div className="message-avatar">
          <img src={message.avatar} alt={message.username} />
        </div>
      )}

      <div className="message-wrap">
        {!isOwn && (message.displayName || message.username) && (
          <div className="message-username">{message.displayName || message.username}</div>
        )}

        <div className="message-bubble-container">
          <svg
            className="message-bubble-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
              </filter>
            </defs>
            <rect
              className="bubble-bg"
              x="0"
              y="0"
              width="100"
              height="100"
              rx="12"
              ry="12"
              fill="currentColor"
            />
          </svg>
          <div className="message-bubble">
            {message.type === "media" && message.media_data ? (
              <div className="media-content">
                {message.media_data.type.startsWith("image/") && (
                  <img
                    src={message.media_data.preview}
                    alt={message.media_data.filename}
                    className="media-preview"
                  />
                )}
                {message.media_data.type.startsWith("video/") && (
                  <video
                    src={message.media_data.preview}
                    controls
                    className="media-preview"
                  />
                )}
                <div className="media-info">
                  <span className="media-filename">{message.media_data.filename}</span>
                  <span className="media-size">
                    {(message.media_data.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ) : (
              <p className="message-text">{message.content}</p>
            )}
            <div className="message-footer">
              <span className="message-time">{formattedTime}</span>
              {isOwn && (
                <svg
                  className={`message-status ${isRead ? "read" : "sent"}`}
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  {isRead ? (
                    <path
                      d="M1 8L6 13L15 2M5.5 8.5L10 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M1 7L6 12L14 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              )}
            </div>
          </div>
        </div>

        {reactions.size > 0 && (
          <div className="message-reactions">
            {Array.from(reactions.entries()).map(([emoji, count]) => (
              <div key={emoji} className="reaction-bubble">
                <span className="reaction-emoji">{emoji}</span>
                {count > 1 && <span className="reaction-count">{count}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showContextMenu && (
        <MessageContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          items={menuItems}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
}
