import { useState } from "react";
import "./ChatWindow.css";

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

interface User {
  id: number;
  username: string;
}

interface Props {
  chat: Chat;
  messages: Message[];
  user: User;
  onSendMessage: (content: string) => void;
}

export default function ChatWindow({ chat, messages, user, onSendMessage }: Props) {
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;
    setSending(true);
    onSendMessage(messageInput);
    setMessageInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar-large">
            {chat.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{chat.name}</h2>
            <p>online</p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button>📞</button>
          <button>📹</button>
          <button>ℹ️</button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet</p>
            <span>Start the conversation</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.sender_id === user.id ? "sent" : "received"}`}
            >
              <div className="message-bubble">
                {msg.content}
              </div>
              <div className="message-time">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="message-composer">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={sending}
        />
        <button onClick={handleSend} disabled={!messageInput.trim() || sending}>
          Send
        </button>
      </div>
    </div>
  );
}