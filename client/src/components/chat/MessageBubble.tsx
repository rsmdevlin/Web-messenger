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

  const isRead = message.is_read === 1;

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

        <div className="message-bubble-container">
          <svg
            className="message-bubble-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
              </filter>
            </defs>
            <rect
              className="bubble-bg"
              x="0"
              y="0"
              width="100"
              height="100"
              rx="12"
              ry="12"
              fill="currentColor"
            />
          </svg>
          <div className="message-bubble">
            <p className="message-text">{message.content}</p>
            <div className="message-footer">
              <span className="message-time">{formattedTime}</span>
              {isOwn && (
                <svg
                  className={`message-status ${isRead ? "read" : "sent"}`}
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  {isRead ? (
                    <path
                      d="M1 8L6 13L15 2M5.5 8.5L10 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M1 7L6 12L14 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
