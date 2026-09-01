import { useState, useRef, useEffect } from "react";
import "./MessageContextMenu.css";

interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function MessageContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Adjust position if menu goes off-screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjustedX = x;
      let adjustedY = y;

      if (rect.right > window.innerWidth) {
        adjustedX = window.innerWidth - rect.width - 8;
      }
      if (rect.bottom > window.innerHeight) {
        adjustedY = window.innerHeight - rect.height - 8;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="message-context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item, idx) => (
        <div key={idx}>
          {item.divider ? (
            <div className="menu-divider"></div>
          ) : (
            <button
              className={`menu-item ${item.danger ? "danger" : ""}`}
              onClick={() => {
                item.action();
                onClose();
              }}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span className="menu-label">{item.label}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
