import { useRef, useEffect, useState } from "react";
import axios from "axios";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import Skeleton from "../common/Skeleton";
import UserProfile from "../profile/UserProfile";
import GroupMembersModal from "./GroupMembersModal";
import "./ChatWindow.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

interface Chat {
  id: number;
  name: string;
  type: string;
  created_by: number;
  created_at: string;
  target_user_id?: number;
  chat_display_name?: string;
}

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
}

interface User {
  id: number;
  username: string;
  avatar?: string;
  displayName?: string;
}

interface Props {
  chat: Chat;
  messages: Message[];
  user: User;
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isLoadingMessages?: boolean;
  onBackClick?: () => void;
  isMobile?: boolean;
  socket?: any;
  onMessageRead?: (messageIds: number[]) => void;
  onlineUsers?: Set<number>;
  targetUserLastSeen?: string;
}

export default function ChatWindow({
  chat,
  messages,
  user,
  onSendMessage,
  onTyping,
  typingUsers,
  messagesEndRef,
  isLoadingMessages = false,
  onBackClick,
  isMobile = false,
  socket,
  onMessageRead,
  onlineUsers = new Set(),
  targetUserLastSeen,
}: Props) {
  const composerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [readMessageIds, setReadMessageIds] = useState<Set<number>>(new Set());
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);

  // Get online status for direct chat
  const isTargetUserOnline = chat.target_user_id ? onlineUsers.has(chat.target_user_id) : false;

  const getStatusText = () => {
    if (typingUsers.length > 0) {
      return `${typingUsers.join(", ")} ${typingUsers.length === 1 ? "is" : "are"} typing...`;
    }
    if (isTargetUserOnline) {
      return "online";
    }
    if (targetUserLastSeen) {
      const lastSeen = new Date(targetUserLastSeen);
      return lastSeen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "offline";
  };

  // Track message visibility and send read receipts
  useEffect(() => {
    if (!socket || !messagesContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const newlyRead: number[] = [];

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = parseInt(entry.target.getAttribute("data-message-id") || "0");
            const element = entry.target as HTMLElement;
            const isOwnMessage = element.getAttribute("data-is-own") === "true";

            // Only send read receipt for other users' messages
            if (!isOwnMessage && messageId && !readMessageIds.has(messageId)) {
              newlyRead.push(messageId);
              setReadMessageIds((prev) => new Set([...prev, messageId]));
            }
          }
        });

        if (newlyRead.length > 0 && socket.connected) {
          console.log(`📖 Sending read receipt for messages:`, newlyRead);
          socket.emit("mark_read", { chat_id: chat.id, message_ids: newlyRead });
          onMessageRead?.(newlyRead);
        }
      },
      { threshold: 0.5 }
    );

    // Observe all message bubbles
    const messageBubbles = messagesContainerRef.current.querySelectorAll("[data-message-id]");
    messageBubbles.forEach((bubble) => observer.observe(bubble));

    return () => observer.disconnect();
  }, [socket, chat.id, readMessageIds, onMessageRead]);

  const handleSendMessage = (content: string) => {
    onSendMessage(content);
  };

  const handleComposerChange = (isEmpty: boolean) => {
    onTyping(!isEmpty);
  };

  return (
    <div className="chat-window" ref={containerRef}>
      <div className="chat-header">
        {isMobile && onBackClick && (
          <button
            className="header-back-btn"
            onClick={onBackClick}
            title="Back to chats"
            aria-label="Back to chats"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 16L6 10L12 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <div className="header-avatar">
          <div
            className="avatar-circle"
            onClick={() => chat.target_user_id && setShowUserProfile(true)}
            style={{ cursor: chat.target_user_id ? "pointer" : "default" }}
          >
            {chat.name[0].toUpperCase()}
          </div>
          <div className="online-indicator"></div>
        </div>

        <div className="header-info">
          <h2 className="header-name">{chat.chat_display_name || chat.name}</h2>
          <p className="header-status">
            {getStatusText()}
          </p>
        </div>

        <div className="header-actions">
          <button className="header-btn" title="Call">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3.5 2.5H6C6.55 2.5 7 2.95 7 3.5V5.5C7 6.05 6.55 6.5 6 6.5H3.5C2.95 6.5 2.5 6.05 2.5 5.5V3.5C2.5 2.95 2.95 2.5 3.5 2.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M7 4.5L12 2V16L7 13.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {chat.type === "group" && (
            <button
              className="header-btn"
              title="Members"
              onClick={() => setShowGroupMembers(true)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 8C2 6.5 3.5 5.5 6 5.5C8.5 5.5 10 6.5 10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 9C9.5 8.8 10.2 8.5 11 8.5C13 8.5 14.5 9.5 14.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {isLoadingMessages ? (
          <div className="messages-skeleton">
            <Skeleton type="message" height="40px" count={5} />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle
                cx="32"
                cy="32"
                r="30"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.2"
              />
              <path
                d="M32 16C23.2 16 16 23.2 16 32C16 35.3 17 38.4 18.8 41L16 48L23.3 45.2C26.1 47 29.3 48 32 48C40.8 48 48 40.8 48 32C48 23.2 40.8 16 32 16Z"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
            <p>No messages yet</p>
            <span>Start the conversation</span>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user.id;
              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  data-is-own={isOwn}
                >
                  <MessageBubble message={msg} isOwn={isOwn} />
                </div>
              );
            })}
            {typingUsers.length > 0 && (
              <div className="message-group typing-group">
                <div className="typing-indicator">
                  <div className="typing-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div ref={composerRef}>
        <Composer
          onSendMessage={handleSendMessage}
          onChange={handleComposerChange}
          onSendMedia={async (file, preview) => {
            if (!selectedChat || !user) return;
            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                const mediaData = {
                  filename: file.name,
                  type: file.type,
                  size: file.size,
                  preview: base64,
                };

                await api.post("/messages", {
                  chat_id: selectedChat.id,
                  content: file.name,
                  type: "media",
                  media_data: mediaData,
                });
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.error("Failed to send media:", err);
            }
          }}
        />
      </div>

      {showUserProfile && chat.target_user_id && (
        <UserProfile
          userId={chat.target_user_id}
          onClose={() => setShowUserProfile(false)}
          isOnline={onlineUsers.has(chat.target_user_id)}
          lastSeen={targetUserLastSeen}
        />
      )}

      {showGroupMembers && chat.type === "group" && (
        <GroupMembersModal
          chatId={chat.id}
          onClose={() => setShowGroupMembers(false)}
        />
      )}
    </div>
  );
}
