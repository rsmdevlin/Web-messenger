import { useEffect, useState } from "react";
import axios from "axios";
import "./GroupMembersModal.css";

interface Member {
  id: number;
  username: string;
  display_name?: string;
  avatar?: string;
  role: "admin" | "member";
}

interface Props {
  chatId: number;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function GroupMembersModal({ chatId, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await api.get(`/chats/${chatId}/participants`);
        if (response.data && Array.isArray(response.data)) {
          setMembers(response.data);
        }
      } catch (err) {
        console.error("Failed to load members:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [chatId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="group-members-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2>Group Members ({members.length})</h2>

        {loading ? (
          <div className="members-loading">Loading members...</div>
        ) : (
          <div className="members-list-container">
            {members.map((member) => (
              <div key={member.id} className="member-item">
                <div className="member-avatar">
                  {member.display_name?.[0] || member.username[0]}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.display_name || member.username}
                    {member.role === "admin" && (
                      <span className="member-badge admin">Admin</span>
                    )}
                  </div>
                  <div className="member-username">@{member.username}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
