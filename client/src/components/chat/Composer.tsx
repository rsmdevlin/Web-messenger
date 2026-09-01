import { useState, useRef, useEffect } from "react";
import MediaUpload from "../media/MediaUpload";
import "./Composer.css";

interface Props {
  onSendMessage: (content: string) => void;
  onChange?: (isEmpty: boolean) => void;
  onSendMedia?: (file: File, preview: string) => void;
}

export default function Composer({ onSendMessage, onChange, onSendMedia }: Props) {
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px";
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

  const handleMediaUpload = (file: File, preview: string) => {
    onSendMedia?.(file, preview);
    setShowMediaUpload(false);
  };

  return (
    <>
      <div className="composer">
        <div className="composer-container">
          <button
            className="composer-btn"
            title="Attach file"
            aria-label="Attach file"
            disabled={sending}
            onClick={() => setShowMediaUpload(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            className="composer-btn"
            title="Photo"
            aria-label="Photo"
            disabled={sending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="2" />
              <path d="M21 15L16 10L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            className="composer-btn"
            title="Payment"
            aria-label="Payment"
            disabled={sending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M16 12H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            className="composer-btn"
            title="Reaction"
            aria-label="Reaction"
            disabled={sending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <circle cx="15" cy="10" r="1.5" fill="currentColor" />
              <path d="M9 14C10 15 11 16 12 16C13 16 14 15 15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="composer-input-wrapper">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              disabled={sending}
              className="composer-input"
              rows={1}
              aria-label="Message input"
            />
          </div>

          <button
            className={`composer-send ${hasText ? "active" : ""} ${sending ? "sending" : ""}`}
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
                  strokeDasharray="9.42"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M17 2L2 8.5L9 10.5L11 17L17 2Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showMediaUpload && (
        <MediaUpload onUpload={handleMediaUpload} onClose={() => setShowMediaUpload(false)} />
      )}
    </>
  );
}

