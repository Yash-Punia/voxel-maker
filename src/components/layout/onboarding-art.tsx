// One drawing per tour step. They are inline SVG rather than images so they
// stay sharp, weigh nothing, and take their colours from the theme tokens the
// rest of the app uses.
//
// Each one shows the thing the step is about, drawn the way the app would draw
// it: square cells, hard edges, the ember accent for whatever the step is
// actually teaching.

const ACCENT = 'var(--color-accent)';
const SOFT = 'var(--color-accent-soft)';
const FILL = 'var(--color-bg-elevated)';
const LINE = 'var(--color-border-strong)';
const MUTED = 'var(--color-text-muted)';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 112"
      role="img"
      aria-hidden="true"
      className="h-28 w-full select-none rounded-lg bg-bg-input"
    >
      {children}
    </svg>
  );
}

interface BoardProps {
  x: number;
  y: number;
  cell?: number;
  cols?: number;
  rows?: number;
  /** Indices of the cells that are painted. */
  filled?: number[];
  tone?: string;
}

/** A flat board of cells, used by several of the drawings. */
function Board({ x, y, cell = 12, cols = 6, rows = 5, filled = [], tone = ACCENT }: BoardProps) {
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const cx = x + (i % cols) * cell;
    const cy = y + Math.floor(i / cols) * cell;
    const on = filled.includes(i);
    cells.push(
      <rect
        key={i}
        x={cx}
        y={cy}
        width={cell - 1}
        height={cell - 1}
        rx="1"
        fill={on ? tone : FILL}
        stroke={on ? 'none' : LINE}
        strokeWidth="0.5"
      />,
    );
  }
  return <>{cells}</>;
}

const MUG = [7, 8, 9, 13, 16, 19, 20, 21];

export function WelcomeArt() {
  return (
    <Frame>
      {/* The mark's idea: a flat board on top, the depth it extrudes into below. */}
      <g transform="translate(160 56)">
        <polygon points="0,-34 52,-4 0,26 -52,-4" fill={SOFT} stroke={ACCENT} strokeWidth="1.5" />
        <polygon points="0,-34 26,-19 0,-4 -26,-19" fill={ACCENT} />
        <polygon points="-52,-4 0,26 0,46 -52,16" fill={FILL} stroke={LINE} strokeWidth="1.5" />
        <polygon points="52,-4 0,26 0,46 52,16" fill={FILL} stroke={LINE} strokeWidth="1.5" opacity="0.7" />
      </g>
    </Frame>
  );
}

export function DrawArt() {
  return (
    <Frame>
      <g transform="translate(94 26)">
        <Board x={0} y={0} filled={MUG} />
        {/* Not every cell is a square: that is the whole point of the mode. */}
        <polygon points="24,0 35,0 35,11" fill={ACCENT} />
        <path d="M60 12 A11 11 0 0 0 71 1 L71 12 Z" fill={ACCENT} />
      </g>
    </Frame>
  );
}

export function DepthArt() {
  return (
    <Frame>
      {/* The same row seen from the side, each cell pushed out a different amount. */}
      {[3, 6, 9, 6, 3].map((depth, i) => (
        <g key={i}>
          <rect x={92 + i * 26} y={72 - depth * 5} width="22" height={depth * 5} rx="1" fill={ACCENT} opacity={0.35 + depth * 0.07} />
          <text x={103 + i * 26} y={88} fill={MUTED} fontSize="9" textAnchor="middle" fontFamily="monospace">{depth}</text>
        </g>
      ))}
      <line x1="84" y1="72" x2="236" y2="72" stroke={LINE} strokeWidth="1" />
    </Frame>
  );
}

export function ModelArt() {
  return (
    <Frame>
      <g transform="translate(160 58)">
        <polygon points="0,-30 44,-6 0,18 -44,-6" fill={ACCENT} />
        <polygon points="-44,-6 0,18 0,40 -44,16" fill={ACCENT} opacity="0.55" />
        <polygon points="44,-6 0,18 0,40 44,16" fill={ACCENT} opacity="0.3" />
      </g>
      <path d="M96 84 A70 24 0 0 0 224 84" fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 4" />
    </Frame>
  );
}

export function SetArt() {
  return (
    <Frame>
      {/* Three props, one palette underneath: the shared palette is the point. */}
      {[0, 1, 2].map((n) => (
        <g key={n} transform={`translate(${52 + n * 78} 18)`}>
          <Board x={0} y={0} cell={9} cols={5} rows={4} filled={[2, 6, 7, 8, 11, 16, 18]} />
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <rect key={n} x={124 + n * 13} y={84} width="10" height="10" rx="2" fill={ACCENT} opacity={0.3 + n * 0.14} />
      ))}
    </Frame>
  );
}

export function FramesArt() {
  return (
    <Frame>
      {/* Three frames of one walk, the moving cell tracked across them. */}
      {[0, 1, 2].map((n) => (
        <g key={n} transform={`translate(${44 + n * 82} 22)`}>
          <rect x="-4" y="-4" width="64" height="64" rx="4" fill="none" stroke={n === 1 ? ACCENT : LINE} strokeWidth="1" />
          <Board x={0} y={0} cell={11} cols={5} rows={5} filled={[7, 11, 12, 13, 16 + n, 20 - n]} />
        </g>
      ))}
      <polygon points="152,98 162,103 152,108" fill={ACCENT} />
    </Frame>
  );
}

export function SceneArt() {
  return (
    <Frame>
      {/* A ground plane with props standing on it, not lying flat. */}
      <polygon points="160,32 250,74 160,100 70,74" fill={FILL} stroke={LINE} strokeWidth="1" />
      {[
        { x: 118, y: 58, h: 26, w: 16 },
        { x: 156, y: 46, h: 36, w: 20 },
        { x: 196, y: 62, h: 20, w: 14 },
      ].map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1.5" fill={ACCENT} opacity={0.9 - i * 0.2} />
          <ellipse cx={p.x + p.w / 2} cy={p.y + p.h + 3} rx={p.w * 0.6} ry="3" fill="var(--color-bg-panel)" />
        </g>
      ))}
    </Frame>
  );
}

export function AssistantArt() {
  return (
    <Frame>
      <g transform="translate(34 26)">
        <rect x="0" y="0" width="118" height="30" rx="8" fill={FILL} stroke={LINE} strokeWidth="1" />
        <path d="M14 30 L14 40 L26 30 Z" fill={FILL} />
        {[0, 1, 2].map((n) => (
          <rect key={n} x={14 + n * 32} y={13} width={n === 2 ? 18 : 26} height="5" rx="2.5" fill={MUTED} />
        ))}
      </g>
      {/* The board filling itself in, which is what the assistant does. */}
      <g transform="translate(184 26)">
        <Board x={0} y={0} cell={11} cols={6} rows={5} filled={[7, 8, 9, 13, 16, 19, 20, 21]} />
      </g>
      <path d="M156 54 L176 54" stroke={ACCENT} strokeWidth="2" strokeDasharray="3 3" />
    </Frame>
  );
}

export function ExportArt() {
  return (
    <Frame>
      <g transform="translate(40 30)">
        <Board x={0} y={0} cell={10} cols={5} rows={5} filled={MUG} />
      </g>
      <path d="M104 56 L136 56" stroke={ACCENT} strokeWidth="2" />
      <polygon points="136,51 146,56 136,61" fill={ACCENT} />
      {['OBJ', 'GLB', 'PNG'].map((label, i) => (
        <g key={label} transform={`translate(160 ${18 + i * 28})`}>
          <rect x="0" y="0" width="118" height="22" rx="4" fill={FILL} stroke={LINE} strokeWidth="1" />
          <rect x="8" y="7" width="8" height="8" rx="1.5" fill={ACCENT} opacity={0.9 - i * 0.25} />
          <text x="26" y="15" fill={MUTED} fontSize="10" fontFamily="monospace">{label}</text>
        </g>
      ))}
    </Frame>
  );
}
