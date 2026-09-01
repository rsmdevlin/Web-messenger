import "./Skeleton.css";

interface SkeletonProps {
  type?: "message" | "chat" | "avatar" | "text" | "button";
  width?: string;
  height?: string;
  count?: number;
}

export default function Skeleton({ type = "text", width = "100%", height = "20px", count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div key={i} className={`skeleton skeleton-${type}`} style={{ width, height }} />
      ))}
    </>
  );
}
