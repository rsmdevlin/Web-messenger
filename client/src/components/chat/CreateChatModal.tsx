import { useState } from "react";
import "./CreateChatModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  loading?: boolean;
}

export default function CreateChatModal({ isOpen, onClose, onCreate, loading }: Props) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name);
      setName("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim()) {
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-content">
          <h2>New Chat</h2>
          <p>Enter chat name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chat name..."
            autoFocus
            disabled={loading}
            className="modal-input"
          />
          <div className="modal-buttons">
            <button onClick={onClose} className="modal-btn cancel" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="modal-btn create"
              disabled={loading || !name.trim()}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
