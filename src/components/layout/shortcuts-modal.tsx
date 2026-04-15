import { useEffect } from "react";

interface ShortcutsModalProps {
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  desc: string;
}

interface Section {
  title: string;
  items: Shortcut[];
}

const SECTIONS: Section[] = [
  {
    title: "Project",
    items: [
      { keys: ["Ctrl+S"],       desc: "Save" },
      { keys: ["Ctrl+Z"],       desc: "Undo" },
      { keys: ["Ctrl+Shift+Z", "Ctrl+Y"], desc: "Redo" },
    ],
  },
  {
    title: "Tools",
    items: [
      { keys: ["B"], desc: "Pencil" },
      { keys: ["E"], desc: "Eraser" },
      { keys: ["F"], desc: "Fill" },
      { keys: ["L"], desc: "Line" },
      { keys: ["D"], desc: "Eyedropper" },
      { keys: ["S"], desc: "Rectangle select" },
    ],
  },
  {
    title: "Shapes",
    items: [
      { keys: ["1", "2", "3", "4", "5", "6", "7", "8"], desc: "Select shape" },
      { keys: ["Space"], desc: "Rotate active shape (or hover-scroll on canvas)" },
    ],
  },
  {
    title: "Canvas",
    items: [
      { keys: ["G"],   desc: "Toggle grid overlay" },
      { keys: ["["],   desc: "Zoom out" },
      { keys: ["]"],   desc: "Zoom in" },
      { keys: ["Alt+↑", "Alt+↓", "Alt+←", "Alt+→"], desc: "Shift canvas" },
    ],
  },
  {
    title: "Selection",
    items: [
      { keys: ["Esc"], desc: "Clear rectangle selection" },
    ],
  },
  {
    title: "Modifier-click (with pencil)",
    items: [
      { keys: ["Ctrl + click"],  desc: "Paint shape only — keep existing colour" },
      { keys: ["Shift + click"], desc: "Paint colour only — keep existing shape" },
    ],
  },
  {
    title: "Help",
    items: [
      { keys: ["?"], desc: "Open this shortcuts reference" },
    ],
  },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center z-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-secondary border border-border rounded-md shadow-app p-5 min-w-130 max-w-160 max-h-[80vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">Keyboard shortcuts</div>
          <button className="btn text-[11px]" onClick={onClose}>Close</button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-widest text-text-muted">{section.title}</div>
              <div className="flex flex-col gap-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-text-secondary">{item.desc}</span>
                    <span className="flex gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 rounded-sm bg-bg-tertiary border border-border text-text-primary text-[10px] font-mono"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
