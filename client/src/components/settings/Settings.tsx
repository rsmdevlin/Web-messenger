import { useState, useRef } from "react";
import axios from "axios";
import "./Settings.css";

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
}

interface Props {
  user: User;
  onBack: () => void;
  onUserUpdate: (user: User) => void;
}

export default function Settings({ user, onBack, onUserUpdate }: Props) {
  const [tab, setTab] = useState<"profile" | "account" | "appearance">("profile");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [customUsername, setCustomUsername] = useState(user.username || "");
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messageStyle, setMessageStyle] = useState<"rounded" | "square">("rounded");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || "/api";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/user/avatar`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUserUpdate({ ...user, avatar: response.data.avatar });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!customUsername.trim()) return;
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/user/username`,
        { username: customUsername },
        { withCredentials: true }
      );
      onUserUpdate(response.data);
      setEditingField(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!password || !newEmail) return;
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/user/email`,
        { email: newEmail, password },
        { withCredentials: true }
      );
      onUserUpdate(response.data);
      setShowEmailVerify(false);
      setPassword("");
      setNewEmail("");
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update email");
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
        <h1>Параметры</h1>
        <div style={{ width: "32px" }} />
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Профиль
        </button>
        <button
          className={`settings-tab ${tab === "account" ? "active" : ""}`}
          onClick={() => setTab("account")}
        >
          Аккаунт
        </button>
        <button
          className={`settings-tab ${tab === "appearance" ? "active" : ""}`}
          onClick={() => setTab("appearance")}
        >
          Вид
        </button>
      </div>

      <div className="settings-content">
        {error && <div className="settings-error">{error}</div>}

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
                className="upload-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Загрузить фото
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
              <label>Имя профиля</label>
              {editingField === "displayName" ? (
                <div className="field-edit">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ваше имя"
                  />
                  <button
                    onClick={() => {
                      setEditingField(null);
                    }}
                    className="btn-save"
                    disabled={loading}
                  >
                    Сохранить
                  </button>
                </div>
              ) : (
                <div className="field-display">
                  <span>{displayName || "Не указано"}</span>
                  <button onClick={() => setEditingField("displayName")}>Изменить</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="settings-section">
            <div className="settings-field">
              <label>@username</label>
              {editingField === "username" ? (
                <div className="field-edit">
                  <input
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="@username"
                  />
                  <button
                    onClick={handleUpdateUsername}
                    className="btn-save"
                    disabled={loading}
                  >
                    Сохранить
                  </button>
                </div>
              ) : (
                <div className="field-display">
                  <span>@{user.username}</span>
                  <button onClick={() => setEditingField("username")}>Изменить</button>
                </div>
              )}
            </div>

            <div className="settings-field">
              <label>Email</label>
              {!showEmailVerify ? (
                <div className="field-display">
                  <span>{user.email}</span>
                  <button onClick={() => setShowEmailVerify(true)}>Изменить</button>
                </div>
              ) : (
                <div className="field-edit email-verify">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Новый email"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль для подтверждения"
                  />
                  <div className="verify-buttons">
                    <button
                      onClick={handleUpdateEmail}
                      className="btn-save"
                      disabled={loading || !newEmail || !password}
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => {
                        setShowEmailVerify(false);
                        setPassword("");
                        setNewEmail("");
                      }}
                      className="btn-cancel"
                    >
                      Отмена
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
              <label>Стиль сообщений</label>
              <div className="style-options">
                <button
                  className={`style-btn ${messageStyle === "rounded" ? "active" : ""}`}
                  onClick={() => setMessageStyle("rounded")}
                >
                  <div className="preview rounded-preview" />
                  Круглые
                </button>
                <button
                  className={`style-btn ${messageStyle === "square" ? "active" : ""}`}
                  onClick={() => setMessageStyle("square")}
                >
                  <div className="preview square-preview" />
                  Квадратные
                </button>
              </div>
            </div>

            <div className="settings-field">
              <label>Тема оформления</label>
              <div className="style-options">
                <button
                  className={`style-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <div className="preview dark-preview" />
                  Темная
                </button>
                <button
                  className={`style-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <div className="preview light-preview" />
                  Светлая
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
