import { useState, useEffect, useRef } from "react";
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
        <button className="header-back" title="Back">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M9 1L1.5 8L9 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        
        <div className="header-avatar">
          <div className="avatar-circle">{chat.name.charAt(0).toUpperCase()}</div>
          <div className="online-indicator"></div>
        </div>
        
        <div className="header-info">
          <h2 className="header-name">{chat.name}</h2>
          <p className="header-status">online</p>
        </div>
        
        <div className="header-actions">
          <button className="header-btn" title="Call">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 4.5C1 3.4 1.9 2.5 3 2.5H9C10.1 2.5 11 3.4 11 4.5V13.5C11 14.6 10.1 15.5 9 15.5H3C1.9 15.5 1 14.6 1 13.5V4.5Z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 6.5L16 4V14L11 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Нет сообщений</p>
            <span>Начните беседу</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user.id;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                user={user}
                isOwn={isOwn}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <Composer onSendMessage={handleSendMessage} />
    </div>
  );
}