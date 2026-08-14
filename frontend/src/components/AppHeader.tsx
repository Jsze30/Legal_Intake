interface AppHeaderProps {
  onNavigateHome: () => void;
}

export function AppHeader({ onNavigateHome }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <button className="brand" type="button" onClick={onNavigateHome} aria-label="Finch transcript intake">
          <img src="https://www.finchlegal.com/brand/finch-logo.svg" alt="Finch" />
        </button>
      </div>
    </header>
  );
}
