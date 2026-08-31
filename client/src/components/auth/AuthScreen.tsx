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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering
        ? {
            email: formData.email,
            password: formData.password,
            username: formData.username || undefined,
          }
        : {
            email: formData.email,
            password: formData.password,
          };

      await api.post(endpoint, payload);
      setFormData({ email: "", password: "", username: "" });
      onAuthSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (isRegistering ? "Registration failed" : "Login failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setFormData({ email: "", password: "", username: "" });
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
              className={`input-wrapper ${
                focusedField === "email" ? "focused" : ""
              } ${formData.email ? "filled" : ""}`}
            >
              <input
                type="email"
                id="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="input-group">
              <div
                className={`input-wrapper ${
                  focusedField === "username" ? "focused" : ""
                } ${formData.username ? "filled" : ""}`}
              >
                <input
                  type="text"
                  id="username"
                  placeholder="Username (optional)"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <div
              className={`input-wrapper ${
                focusedField === "password" ? "focused" : ""
              } ${formData.password ? "filled" : ""}`}
            >
              <input
                type="password"
                id="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                required
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>{isRegistering ? "Creating account..." : "Signing in..."}</span>
              </>
            ) : isRegistering ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleToggleMode}
          className="auth-toggle"
          disabled={loading}
        >
          {isRegistering
            ? "Already have an account? Sign In"
            : "Create an account? Register"}
        </button>
      </div>
    </div>
  );
}
