import { useState } from "react";
import "./CreateGroupModal.css";

interface User {
  id: number;
  username: string;
  display_name?: string;
}

interface Props {
  onClose: () => void;
  onCreateGroup: (name: string, participants: number[]) => void;
  users: User[];
}

export default function CreateGroupModal({ onClose, onCreateGroup, users }: Props) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const handleToggleUser = (userId: number) => {
    const newSet = new Set(selected);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelected(newSet);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.size < 1) return;
    setCreating(true);
    try {
      onCreateGroup(groupName.trim(), Array.from(selected));
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2>Create Group Chat</h2>

        <input
          type="text"
          placeholder="Group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="group-name-input"
        />

        <div className="members-list">
          <h3>Select members</h3>
          {users.map((user) => (
            <label key={user.id} className="member-checkbox">
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                onChange={() => handleToggleUser(user.id)}
              />
              <span className="member-name">
                {user.display_name || user.username}
              </span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn create"
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.size === 0 || creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
