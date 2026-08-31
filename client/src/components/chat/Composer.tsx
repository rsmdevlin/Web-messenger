import { useState, useRef, useEffect } from "react";
import "./Composer.css";

interface Props {
  onSendMessage: (content: string) => void;
  onChange?: (isEmpty: boolean) => void;
}

export default function Composer({ onSendMessage, onChange }: Props) {
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = messageInput.trim().length > 0;

  return (
    <div className="composer">
      <button className="composer-btn composer-attach" title="Attach">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <textarea
        ref={textareaRef}
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message..."
        disabled={sending}
        className="composer-input"
        rows={1}
      />

      <button
        className={`composer-btn composer-send ${hasText ? "active" : ""}`}
        onClick={handleSend}
        disabled={!hasText || sending}
        title="Send"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M13.5 1.5L1 6.8L6.5 8.9L8.6 14.4L13.5 1.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
