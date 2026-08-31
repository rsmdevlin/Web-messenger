import { useState, useRef } from "react";
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
  avatar?: string;
}

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<{ emoji: string; count: number }[]>([]);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  const handleAddReaction = (emoji: string) => {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        return prev
          .map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r))
          .filter((r) => r.count > 0);
      }
      return [...prev, { emoji, count: 1 }];
    });
    setShowReactions(false);
  };

  return (
    <div className={`message-group ${isOwn ? "own" : "other"}`}>
      {!isOwn && message.avatar && (
        <div className="message-avatar">
          <img src={message.avatar} alt={message.username} />
        </div>
      )}

      <div className="message-wrap" ref={bubbleRef}>
        <div
          className="message-bubble"
          onDoubleClick={() => setShowReactions(!showReactions)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowReactions(!showReactions);
          }}
        >
          <p className="message-text">{message.content}</p>
          <span className="message-time">{formattedTime}</span>
        </div>

        {reactions.length > 0 && (
          <div className="message-reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                className="reaction-badge"
                onClick={() => handleAddReaction(r.emoji)}
              >
                {r.emoji}
                {r.count > 1 && <span className="reaction-count">{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        {showReactions && (
          <div className="reaction-picker">
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                className="reaction-btn"
                onClick={() => handleAddReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}