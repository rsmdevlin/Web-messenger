import { useState, useRef } from "react";
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

interface ValidationErrors {
  email?: string;
  password?: string;
  username?: string;
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const emailInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (isRegistering && formData.username && formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof ValidationErrors];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

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
      setValidationErrors({});
      onAuthSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (isRegistering ? "Registration failed. Please try again." : "Invalid email or password")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError("");
    setValidationErrors({});
    setFormData({ email: "", password: "", username: "" });
    setShowPassword(false);
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Basa</h1>
          <p>Premium Messenger</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <div
              className={`input-wrapper ${
                focusedField === "email" ? "focused" : ""
              } ${formData.email ? "filled" : ""} ${
                validationErrors.email ? "error" : ""
              }`}
            >
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="email"
                aria-invalid={!!validationErrors.email}
                aria-describedby={validationErrors.email ? "email-error" : undefined}
              />
            </div>
            {validationErrors.email && (
              <span id="email-error" className="input-error">{validationErrors.email}</span>
            )}
          </div>

          {isRegistering && (
            <div className="input-group">
              <label htmlFor="username" className="input-label">Username (optional)</label>
              <div
                className={`input-wrapper ${
                  focusedField === "username" ? "focused" : ""
                } ${formData.username ? "filled" : ""} ${
                  validationErrors.username ? "error" : ""
                }`}
              >
                <input
                  ref={usernameInputRef}
                  type="text"
                  id="username"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  autoComplete="username"
                  aria-invalid={!!validationErrors.username}
                  aria-describedby={validationErrors.username ? "username-error" : undefined}
                />
              </div>
              {validationErrors.username && (
                <span id="username-error" className="input-error">{validationErrors.username}</span>
              )}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <div
              className={`input-wrapper password-wrapper ${
                focusedField === "password" ? "focused" : ""
              } ${formData.password ? "filled" : ""} ${
                validationErrors.password ? "error" : ""
              }`}
            >
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                aria-invalid={!!validationErrors.password}
                aria-describedby={validationErrors.password ? "password-error" : undefined}
              />
              {formData.password && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              )}
            </div>
            {validationErrors.password && (
              <span id="password-error" className="input-error">{validationErrors.password}</span>
            )}
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="auth-button"
          >
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
            : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}
