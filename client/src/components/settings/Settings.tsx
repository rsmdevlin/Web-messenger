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
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function Settings({ user, onBack, onUserUpdate }: Props) {
  const [tab, setTab] = useState<"profile" | "account" | "appearance">("profile");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [customUsername, setCustomUsername] = useState(user.username || "");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(user.theme === "light" ? "light" : "dark");
  const [messageStyle, setMessageStyle] = useState<"rounded" | "square">(
    user.message_style === "square" ? "square" : "rounded"
  );
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

  const handleUpdateUsername = async () => {
    if (!customUsername.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.put("/user/username", { username: customUsername });
      onUserUpdate(response.data);
      setSuccess("Username updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.put("/user/display-name", { displayName });
      onUserUpdate(response.data);
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

  const handleUpdatePreferences = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.put("/user/profile", {
        theme,
        messageStyle,
      });
      onUserUpdate(response.data);
      setSuccess("Preferences updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="settings-back" onClick={onBack} title="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 16L6 10L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1>Settings</h1>
        <div style={{ width: "32px" }} />
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
      </div>

      <div className="settings-content">
        {error && <div className="settings-error">{error}</div>}
        {success && <div className="settings-success">{success}</div>}

        {tab === "profile" && (
          <div className="settings-section">
            <div className="avatar-section">
              <div className="avatar-large">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" />
                ) : (
                  <div className="avatar-letter">{user.username[0].toUpperCase()}</div>
                )}
              </div>
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
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
              <label>Display Name</label>
              <div className="field-edit">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  disabled={loading}
                />
                <button
                  onClick={handleUpdateDisplayName}
                  className="btn-save"
                  disabled={loading || displayName === user.displayName}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="settings-section">
            <div className="settings-field">
              <label>@Username</label>
              <div className="field-edit">
                <input
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  placeholder="@username"
                  disabled={loading}
                />
                <button
                  onClick={handleUpdateUsername}
                  className="btn-save"
                  disabled={loading || customUsername === user.username}
                >
                  Update
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label>Email</label>
              {!showEmailVerify ? (
                <div className="field-display">
                  <span>{user.email}</span>
                  <button
                    onClick={() => setShowEmailVerify(true)}
                    className="btn-edit"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="field-edit email-verify">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email"
                    disabled={loading}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password to confirm"
                    disabled={loading}
                  />
                  <div className="verify-buttons">
                    <button
                      onClick={handleUpdateEmail}
                      className="btn-save"
                      disabled={loading || !newEmail || !password}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowEmailVerify(false);
                        setPassword("");
                        setNewEmail("");
                      }}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div className="settings-section">
            <div className="settings-field">
              <label>Message Bubbles</label>
              <div className="style-options">
                <button
                  className={`style-btn ${messageStyle === "rounded" ? "active" : ""}`}
                  onClick={() => setMessageStyle("rounded")}
                >
                  <div className="preview rounded-preview" />
                  Rounded
                </button>
                <button
                  className={`style-btn ${messageStyle === "square" ? "active" : ""}`}
                  onClick={() => setMessageStyle("square")}
                >
                  <div className="preview square-preview" />
                  Square
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label>Theme</label>
              <div className="style-options">
                <button
                  className={`style-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="preview dark-preview" />
                  Dark
                </button>
                <button
                  className={`style-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <div className="preview light-preview" />
                  Light
                </button>
              </div>
            </div>

            <button
              onClick={handleUpdatePreferences}
              className="btn-save wide"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
