import { useState, useRef, useEffect } from "react";
import "./Composer.css";

interface Props {
  onSendMessage: (content: string) => void;
  onChange?: (isEmpty: boolean) => void;
}

export default function Composer({ onSendMessage, onChange }: Props) {
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [messageInput]);

  useEffect(() => {
    onChange?.(messageInput.trim().length === 0);
  }, [messageInput, onChange]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;
    setSending(true);
    onSendMessage(messageInput);
    setMessageInput("");
    setSending(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = messageInput.trim().length > 0;

  return (
    <div className={`composer ${isFocused ? "focused" : ""}`}>
      <div className="composer-container">
        <button
          className="composer-btn composer-attach"
          title="Attach file"
          aria-label="Attach file"
          disabled={sending}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2V14M2 8H14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="composer-input-wrapper">
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Message..."
            disabled={sending}
            className="composer-input"
            rows={1}
            aria-label="Message input"
          />
        </div>

        <button
          className={`composer-btn composer-send ${hasText ? "active" : ""} ${sending ? "sending" : ""}`}
          onClick={handleSend}
          disabled={sending || !hasText}
          title={hasText ? "Send message" : "Type something"}
          type="button"
          aria-label="Send message"
        >
          {sending ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="spinner">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                opacity="0.2"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray="9.42"
                strokeDashoffset="0"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M14.5 1.5L1 6.8L6.5 8.9L8.6 14.4L14.5 1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
