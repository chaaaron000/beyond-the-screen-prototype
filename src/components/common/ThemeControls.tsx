export type ThemeMode = "light" | "dark";

export type PaletteId =
  | "material"
  | "onedark"
  | "github"
  | "nord"
  | "vscode"
  | "gruvbox";

export const PALETTE_LABELS: Record<PaletteId, string> = {
  material: "Material",
  onedark: "One Dark",
  github: "GitHub",
  nord: "Nord",
  vscode: "VSCode",
  gruvbox: "Gruvbox",
};

interface ThemeControlsProps {
  mode: ThemeMode;
  palette: PaletteId;
  onModeChange: (mode: ThemeMode) => void;
  onPaletteChange: (palette: PaletteId) => void;
}

export function ThemeControls({ mode, palette, onModeChange, onPaletteChange }: ThemeControlsProps) {
  return (
    <div className="theme-controls">
      <button
        type="button"
        className="theme-toggle"
        aria-label={mode === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환"}
        title={mode === "dark" ? "라이트 테마" : "다크 테마"}
        onClick={() => onModeChange(mode === "dark" ? "light" : "dark")}
      >
        {mode === "dark" ? "밝게" : "어둡게"}
      </button>
      <select
        className="palette-select"
        aria-label="색상 팔레트"
        title="색상 팔레트"
        value={palette}
        onChange={(event) => onPaletteChange(event.target.value as PaletteId)}
      >
        {(Object.keys(PALETTE_LABELS) as PaletteId[]).map((id) => (
          <option value={id} key={id}>{PALETTE_LABELS[id]}</option>
        ))}
      </select>
    </div>
  );
}
