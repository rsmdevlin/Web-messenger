import "./MessageBubble.css";

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  type: string;
  is_read: number;
  created_at: string;
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
    <div className={`message-bubble-wrap ${isOwn ? "own" : "incoming"}`}>
      <svg
        className="bubble-svg"
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>
            {`
              .bubble-fill { fill: ${isOwn ? "rgba(91, 141, 255, 0.09)" : "rgba(255, 255, 255, 0.03)"}; }
              .bubble-stroke { stroke: ${isOwn ? "#5B8DFF" : "#2A2A35"}; }
            `}
          </style>
        </defs>
        <path
          className="bubble-path bubble-fill bubble-stroke"
          d={isOwn ? 
            "M 8,8 L 192,8 Q 200,8 200,16 L 200,44 Q 200,52 192,52 L 16,52 Q 8,52 8,44 L 8,16 Q 8,8 8,8" :
            "M 8,8 Q 0,8 0,16 L 0,44 Q 0,52 8,52 L 184,52 Q 192,52 192,44 L 192,8 Q 192,8 184,8 L 8,8"
          }
          strokeWidth="1.5"
          strokeDasharray="0"
          strokeDashoffset="0"
          style={{
            animation: "strokeDraw 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          }}
        />
      </svg>
      
      <div className="bubble-content">
        <div className="message-text">{message.content}</div>
        <div className="message-meta">
          <span className="message-time">{formattedTime}</span>
          {isOwn && (
            <svg className="message-status" width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M1 8L6 13L15 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}