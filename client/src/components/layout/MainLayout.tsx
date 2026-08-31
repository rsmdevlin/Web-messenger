import "./MainLayout.css";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export default function MainLayout({ sidebar, main }: Props) {
  return (
    <div className="main-layout">
      <div className="layout-sidebar">{sidebar}</div>
      <div className="layout-main">{main}</div>
    </div>
  );
}