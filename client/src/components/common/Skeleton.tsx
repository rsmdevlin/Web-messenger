import "./Skeleton.css";

interface Props {
  type?: "message" | "chatItem" | "line";
  height?: string;
  width?: string;
  count?: number;
}

export default function Skeleton({ type = "line", height = "20px", width = "100%", count = 1 }: Props) {
  const getSkeletonClass = () => {
    switch (type) {
      case "message":
        return "skeleton-message";
      case "chatItem":
        return "skeleton-chat-item";
      case "line":
      default:
        return "skeleton-line";
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${getSkeletonClass()}`} style={{ height, width }} />
      ))}
    </>
  );
}
