import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";

export type Section = "study" | "timer";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "study", label: "Study" },
  { value: "timer", label: "Timer" },
];

/**
 * A quiet frame: wordmark, the two modes, and Settings kept secondary.
 * No sidebar, no dashboard, no persistent large header. While a session is
 * active the modes disappear and only the wordmark and Settings remain, so
 * Quit stays reachable without any configuration on screen.
 */
export function AppShell({
  showNav,
  section,
  onSection,
  settingsOpen,
  onToggleSettings,
  notice,
  children,
}: {
  showNav: boolean;
  section: Section;
  onSection: (next: Section) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <header className="app-header">
        <span className="wordmark">SUNDIAL</span>
        {showNav ? (
          <nav className="app-nav" aria-label="Mode">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                className="nav-tab"
                aria-current={section === s.value ? "page" : undefined}
                onClick={() => onSection(s.value)}
              >
                {s.label}
              </button>
            ))}
          </nav>
        ) : (
          <span className="header-title type-heading">
            {settingsOpen ? "Settings" : ""}
          </span>
        )}
        <button
          type="button"
          className="icon-btn app-settings"
          aria-label={settingsOpen ? "Close settings" : "Settings"}
          aria-pressed={settingsOpen}
          onClick={onToggleSettings}
        >
          <Icon name={settingsOpen ? "close" : "sliders"} />
        </button>
      </header>
      {notice}
      <main className="stage">{children}</main>
    </div>
  );
}
