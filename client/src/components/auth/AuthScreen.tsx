import { useState } from "react";
import axios from "axios";
import "./AuthScreen.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

interface Props {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      await api.post(endpoint, formData);
      setFormData({ username: "", email: "", password: "" });
      onAuthSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || (isRegistering ? "Ошибка регистрации" : "Ошибка входа"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setFormData({ username: "", email: "", password: "" });
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Basa</h1>
          <p>Premium Messenger</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <div
              className={`input-wrapper ${focusedField === "username" ? "focused" : ""} ${
                formData.username ? "filled" : ""
              }`}
            >
              <input
                type="text"
                id="username"
                placeholder="Имя пользователя"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                required
                autoComplete="username"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="input-group">
              <div
                className={`input-wrapper ${focusedField === "email" ? "focused" : ""} ${
                  formData.email ? "filled" : ""
                }`}
              >
                <input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <div
              className={`input-wrapper ${focusedField === "password" ? "focused" : ""} ${
                formData.password ? "filled" : ""
              }`}
            >
              <input
                type="password"
                id="password"
                placeholder="Пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                required
                autoComplete={isRegistering ? "new-password" : "current-password"}
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>{isRegistering ? "Регистрация..." : "Вход..."}</span>
              </>
            ) : isRegistering ? (
              "Создать аккаунт"
            ) : (
              "Войти"
            )}
          </button>
        </form>

        <button type="button" onClick={handleToggleMode} className="auth-toggle" disabled={loading}>
          {isRegistering ? "Уже есть аккаунт? Войти" : "Создать аккаунт? Регистрация"}
        </button>
      </div>
    </div>
  );
}