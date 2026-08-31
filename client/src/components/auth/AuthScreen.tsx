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
      setError(err.response?.data?.error || "РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё");
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
            placeholder="РРјСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ"
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
            placeholder="РџР°СЂРѕР»СЊ"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={loading}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "..." : isRegistering ? "Р РµРіРёСЃС‚СЂР°С†РёСЏ" : "Р’С…РѕРґ"}
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
          {isRegistering ? "РЈР¶Рµ РµСЃС‚СЊ Р°РєРєР°СѓРЅС‚? Р’С…РѕРґ" : "РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚? Р РµРіРёСЃС‚СЂР°С†РёСЏ"}
        </button>
      </div>
    </div>
  );
}