import { useState } from "react";
import "./MainLayout.css";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export default function MainLayout({ sidebar, main }: Props) {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="main-layout" data-view={showChat ? "chat" : "list"}>
      <div className="layout-sidebar">{sidebar}</div>
      <div className="layout-main">{main}</div>
    </div>
  );
}