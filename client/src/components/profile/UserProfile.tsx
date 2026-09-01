import { useState, useEffect } from "react";
import axios from "axios";
import "./UserProfile.css";

interface User {
  id: number;
  username: string;
  display_name?: string;
  avatar?: string;
  email?: string;
}

interface Props {
  userId: number;
  onClose: () => void;
  onSendMessage?: (targetUserId: number) => void;
  isOnline?: boolean;
  lastSeen?: string;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function UserProfile({
  userId,
  onClose,
  onSendMessage,
  isOnline = false,
  lastSeen,
}: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get(`/user/${userId}`);
        setUser(response.data);
      } catch (err) {
        console.error("Failed to load user:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
          <button className="profile-close-btn" onClick={onClose}>✕</button>
          <div className="profile-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
          <button className="profile-close-btn" onClick={onClose}>✕</button>
          <div className="profile-error">{error || "User not found"}</div>
        </div>
      </div>
    );
  }

  const getStatusDisplay = () => {
    if (isOnline) {
      return <span className="status-online">🟢 Online</span>;
    }
    if (lastSeen) {
      const time = new Date(lastSeen).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return <span className="status-offline">Last seen at {time}</span>;
    }
    return <span className="status-offline">Offline</span>;
  };

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close-btn" onClick={onClose}>✕</button>

        <div className="profile-header">
          <div className="profile-avatar-large">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">{user.username[0].toUpperCase()}</div>
            )}
            <div className={`profile-status-dot ${isOnline ? "online" : "offline"}`}></div>
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{user.display_name || user.username}</h2>
            <p className="profile-username">@{user.username}</p>
            <div className="profile-status">{getStatusDisplay()}</div>
          </div>
        </div>

        <div className="profile-actions">
          {onSendMessage && (
            <button
              className="profile-action-btn send-message"
              onClick={() => {
                onSendMessage(userId);
                onClose();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M16 2L2 9L16 16V11L10 9L16 7V2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Send Message
            </button>
          )}
          <button className="profile-action-btn block">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Block
          </button>
        </div>

        <div className="profile-details">
          <div className="profile-detail-row">
            <span className="detail-label">Username</span>
            <span className="detail-value">@{user.username}</span>
          </div>
          {user.email && (
            <div className="profile-detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
