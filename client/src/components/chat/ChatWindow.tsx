import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
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
  avatar?: string;
}

interface Props {
  chat: Chat;
  messages: Message[];
  user: User;
  onSendMessage: (content: string) => void;
}

export default function ChatWindow({ chat, messages, user, onSendMessage }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    onSendMessage(content);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-avatar">
          <div className="avatar-circle">{chat.name[0].toUpperCase()}</div>
          <div className="online-indicator"></div>
        </div>

        <div className="header-info">
          <h2 className="header-name">{chat.name}</h2>
          <p className="header-status">онлайн</p>
        </div>

        <div className="header-actions">
          <button className="header-btn" title="Звонок">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3.5 2.5H6C6.55 2.5 7 2.95 7 3.5V5.5C7 6.05 6.55 6.5 6 6.5H3.5C2.95 6.5 2.5 6.05 2.5 5.5V3.5C2.5 2.95 2.95 2.5 3.5 2.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path d="M7 4.5L12 2V16L7 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path
                d="M32 16C23.2 16 16 23.2 16 32C16 35.3 17 38.4 18.8 41L16 48L23.3 45.2C26.1 47 29.3 48 32 48C40.8 48 48 40.8 48 32C48 23.2 40.8 16 32 16Z"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
            <p>Нет сообщений</p>
            <span>Начните беседу</span>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user.id;
              return (
                <MessageBubble key={msg.id} message={msg} isOwn={isOwn} />
              );
            })}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-bubble">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <Composer onSendMessage={handleSendMessage} />
    </div>
  );
}
