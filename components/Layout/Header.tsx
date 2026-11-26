import React from 'react';

type ViewMode = 'tree' | 'list' | 'archive';
const VIEWS: Array<[ViewMode, string]> = [
  ['tree', 'Árbol'],
  ['list', 'Lista'],
  ['archive', 'Archivo'],
];

/** Paper header: name, the three views, and two quiet buttons (guide and settings). */
const Header: React.FC<{ viewMode: ViewMode; onViewMode: (mode: ViewMode) => void; onOpenGuide: () => void; onOpenSettings: () => void }> = ({
  viewMode,
  onViewMode,
  onOpenGuide,
  onOpenSettings,
}) => (
  <header className="pt-header">
    <div className="pt-brand">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="6" r="3.2" fill="#f2cf5b" stroke="#a8892f" strokeWidth="0.8" />
        <path d="M16 29 C15.6 24 15.4 20 16 15" stroke="#8f8e84" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M16 18 C12 16 9 14 7 10 M16 16 C20 14 23 12 25 8 M16 21 C19.5 20 22 19 25 16" stroke="#6f9a47" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M16 29 C12 30 9 31 5 31 M16 29 C20 30 23 31 27 31" stroke="#c4463a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
      <h1>Productivitree</h1>
    </div>
    <nav className="pt-views" aria-label="Cambiar vista">
      {VIEWS.map(([mode, label]) => (
        <button key={mode} aria-pressed={viewMode === mode} onClick={() => onViewMode(mode)}>
          {label}
        </button>
      ))}
    </nav>
    <div className="pt-tools">
      <button onClick={onOpenGuide} title="Ver la guía" aria-label="Ver la guía">
        ?
      </button>
      <button onClick={onOpenSettings} title="Ajustes, privacidad y datos" aria-label="Ajustes">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  </header>
);

export default Header;
