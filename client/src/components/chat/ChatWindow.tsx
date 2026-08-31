import { useState, useEffect, useRef } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;
    setSending(true);
    onSendMessage(messageInput);
    setMessageInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    // Update has-text attribute
    if (composerRef.current) {
      composerRef.current.setAttribute(
        "data-has-text",
        e.target.value.trim().length > 0 ? "true" : "false"
      );
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="icon-btn" title="Back">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path
              d="M9 1L1.5 8L9 15"
              stroke="var(--text)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="avatar-header">
          <div className="avatar-circle">{chat.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">{chat.name}</div>
          <div className="chat-header-status">online</div>
        </div>
        <div className="chat-header-right">
          <button className="icon-btn" title="Call">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M1 4.5C1 3.4 1.9 2.5 3 2.5H9C10.1 2.5 11 3.4 11 4.5V13.5C11 14.6 10.1 15.5 9 15.5H3C1.9 15.5 1 14.6 1 13.5V4.5Z"
                stroke="var(--text-muted)"
                strokeWidth="1.4"
              />
              <path
                d="M11 6.5L16 4V14L11 11.5"
                stroke="var(--text-muted)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet</p>
            <span>Start the conversation</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`bubble-wrap ${msg.sender_id === user.id ? "own" : "incoming"}`}
            >
              <div className="bubble-inner">
                <div className="message-text">{msg.content}</div>
                <div className="msg-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="composer" ref={composerRef} data-has-text="false">
        <button className="composer-plus" title="Add">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1V13M1 7H13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <textarea
          value={messageInput}
          onChange={handleComposerChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={sending}
          className="composer-field"
        />
        <button
          className="composer-send"
          onClick={handleSend}
          disabled={!messageInput.trim() || sending}
          title="Send"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M13.5 1.5L1 6.8L6.5 8.9L8.6 14.4L13.5 1.5Z"
              stroke="var(--text-muted)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}