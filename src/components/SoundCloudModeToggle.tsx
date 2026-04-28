export type SoundCloudPanelMode = "radio" | "widget" | "decks";

interface SoundCloudModeToggleProps {
  activeMode: SoundCloudPanelMode;
  onChangeMode: (mode: SoundCloudPanelMode) => void;
}

const SOUNDCLOUD_MODE_OPTIONS: Array<{ mode: SoundCloudPanelMode; label: string }> = [
  { mode: "radio", label: "Radio" },
  { mode: "widget", label: "Widget" },
  { mode: "decks", label: "DJ Decks" },
];

export function SoundCloudModeToggle({ activeMode, onChangeMode }: SoundCloudModeToggleProps) {
  return (
    <div className="soundcloud-mode-toggle" role="group" aria-label="SoundCloud mode">
      {SOUNDCLOUD_MODE_OPTIONS.map((option) => {
        const isActive = activeMode === option.mode;

        return (
          <button
            key={option.mode}
            type="button"
            className={`soundcloud-mode-button ${isActive ? "soundcloud-mode-button-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onChangeMode(option.mode)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
