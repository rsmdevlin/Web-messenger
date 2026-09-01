import "./MessageBubble.css";

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  is_read: number;
  created_at: string;
  username?: string;
  avatar?: string;
}

interface Props {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message-group ${isOwn ? "own" : "other"}`}>
      {!isOwn && message.avatar && (
        <div className="message-avatar">
          <img src={message.avatar} alt={message.username} />
        </div>
      )}

      <div className="message-wrap">
        {!isOwn && message.username && (
          <div className="message-username">{message.username}</div>
        )}

        <div className="message-bubble">
          <p className="message-text">{message.content}</p>
          <span className="message-time">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}
