import { useState, useRef } from "react";
import axios from "axios";
import "./Settings.css";

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
  theme?: string;
  message_style?: string;
}

interface Props {
  user: User;
  onBack: () => void;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function Settings({ user, onBack, onUserUpdate, onLogout }: Props) {
  const [tab, setTab] = useState<"profile" | "account" | "appearance" | "about">("profile");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const response = await api.post("/user/avatar", { avatar: base64 });
        onUserUpdate({ ...user, avatar: response.data.avatar });
        setSuccess("Avatar updated successfully");
        setTimeout(() => setSuccess(""), 3000);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.put("/user/display-name", { displayName: displayName.trim() });
      if (response.data && response.data[0]) {
        onUserUpdate(response.data[0]);
      } else if (response.data) {
        onUserUpdate(response.data);
      }
      setSuccess("Display name updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update display name");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!password || !newEmail) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.put("/user/email", { email: newEmail, password });
      onUserUpdate(response.data);
      setShowEmailVerify(false);
      setPassword("");
      setNewEmail("");
      setSuccess("Email updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back" onClick={onBack} title="Back" aria-label="Go back">
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
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          className={`settings-tab ${tab === "account" ? "active" : ""}`}
          onClick={() => setTab("account")}
        >
          Account
        </button>
        <button
          className={`settings-tab ${tab === "appearance" ? "active" : ""}`}
          onClick={() => setTab("appearance")}
        >
          Appearance
        </button>
        <button
          className={`settings-tab ${tab === "about" ? "active" : ""}`}
          onClick={() => setTab("about")}
        >
          About
        </button>
      </div>

      <div className="settings-content">
        {error && (
          <div className="settings-alert error" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="11" r="0.5" fill="currentColor" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="settings-alert success" role="status">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8L6 12L14 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {success}
          </div>
        )}

        {tab === "profile" && (
          <div className="settings-section">
            <div className="section-title">Profile Information</div>

            <div className="avatar-section">
              <div className="avatar-large">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  getAvatarInitials(user.displayName || user.username)
                )}
              </div>
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 6H10.5L9.5 2H6.5L5.5 6H4L6 4L8 2L10 4L12 6Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 14H14M4 8C4 10.2 5.8 12 8 12C10.2 12 12 10.2 12 8C12 5.8 10.2 4 8 4C5.8 4 4 5.8 4 8Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
                Change Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="display-name">Display Name</label>
              <div className="field-edit">
                <input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  disabled={loading}
                />
                <button
                  onClick={handleUpdateDisplayName}
                  className="btn-action"
                  disabled={loading || displayName === user.displayName}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="settings-info">
              <div className="info-row">
                <span className="info-label">@Username:</span>
                <span className="info-value">@{user.username}</span>
              </div>
              <div className="info-row">
                <span className="info-label">ID:</span>
                <span className="info-value">{user.id}</span>
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="settings-section">
            <div className="section-title">Account Settings</div>

            <div className="settings-field">
              <label htmlFor="current-email">Email Address</label>
              {!showEmailVerify ? (
                <div className="field-display">
                  <span className="email-value">{user.email}</span>
                  <button
                    onClick={() => setShowEmailVerify(true)}
                    className="btn-secondary"
                  >
                    Change Email
                  </button>
                </div>
              ) : (
                <div className="field-edit email-verify">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                    disabled={loading}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Confirm with password"
                    disabled={loading}
                  />
                  <div className="verify-buttons">
                    <button
                      onClick={handleUpdateEmail}
                      className="btn-action"
                      disabled={loading || !newEmail || !password}
                    >
                      {loading ? "Confirming..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => {
                        setShowEmailVerify(false);
                        setPassword("");
                        setNewEmail("");
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-divider" />

            <button onClick={onLogout} className="btn-danger">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 14H2V2H6M10 10L14 6L10 2M14 6H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign Out
            </button>
          </div>
        )}

        {tab === "appearance" && (
          <div className="settings-section">
            <div className="section-title">Appearance</div>

            <div className="settings-info">
              <p className="info-text">
                Customize how Basa looks and feels. Theme settings will be applied across your entire experience.
              </p>
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="settings-section">
            <div className="section-title">About Basa</div>

            <div className="about-content">
              <div className="about-logo">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="url(#grad)" opacity="0.1" />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#5B8DFF" />
                      <stop offset="100%" stopColor="#7BA3FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div>
                  <h3>Basa Messenger</h3>
                  <p>Premium messaging experience</p>
                </div>
              </div>

              <div className="about-info">
                <div className="info-item">
                  <span className="label">Version</span>
                  <span className="value">2.0.0</span>
                </div>
                <div className="info-item">
                  <span className="label">Build</span>
                  <span className="value">2024.09</span>
                </div>
              </div>

              <p className="about-text">
                Basa is a premium messaging platform designed for modern communication. Built with React, TypeScript, and premium UI/UX principles.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
