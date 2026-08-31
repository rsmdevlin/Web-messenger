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
      // BUGFIX: Proper error message handling with UTF-8
      setError(err.response?.data?.error || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Web Messenger</h1>
          <p>Premium Dark Messenger</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={loading}
            required
          />
          {isRegistering && (
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              required
            />
          )}
          <input
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={loading}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "..." : isRegistering ? "Регистрация" : "Вход"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
          }}
          className="auth-toggle"
        >
          {isRegistering ? "Уже есть аккаунт? Вход" : "Создать аккаунт? Регистрация"}
        </button>
      </div>
    </div>
  );
}