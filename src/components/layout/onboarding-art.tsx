// One drawing per tour step.
//
// Two rules hold them together. Flat drawings mean the flat board, isometric
// drawings mean the built model, so the projection itself carries the idea the
// step is teaching. And the accent is spent on the subject only: the scaffolding
// around it stays in surface tones, which is what keeps nine of these from
// reading as nine orange posters.
//
// A CSS transform replaces an element's SVG transform attribute rather than
// composing with it, so anything animated sits inside the group that positions
// it. Never put an oa- class on an element carrying transform=.

const ACCENT = 'var(--color-accent)';
const FILL = 'var(--color-bg-elevated)';
const LINE = 'var(--color-border)';
const EDGE = 'var(--color-border-strong)';
const MUTED = 'var(--color-text-muted)';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 112"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className="aspect-[320/112] w-full select-none rounded-lg border border-border bg-bg-input"
    >
      {children}
    </svg>
  );
}

/* ── flat board ─────────────────────────────────────────────────────────────
   The 2D stage: a grid of square cells, some painted. */

interface BoardProps {
  cell?: number;
  cols?: number;
  rows?: number;
  filled?: number[];
  tone?: string;
  /** Milliseconds before the first painted cell appears. */
  delay?: number;
  /** Per-cell stagger. */
  step?: number;
}

function Board({ cell = 12, cols = 6, rows = 5, filled = [], tone = ACCENT, delay = 0, step = 55 }: BoardProps) {
  return (
    <>
      {Array.from({ length: cols * rows }, (_, i) => {
        const on = filled.includes(i);
        return (
          <rect
            key={i}
            x={(i % cols) * cell}
            y={Math.floor(i / cols) * cell}
            width={cell - 1.5}
            height={cell - 1.5}
            rx="1.5"
            fill={on ? tone : 'none'}
            stroke={on ? 'none' : LINE}
            strokeWidth="1"
            className={on ? 'oa-pop' : undefined}
            style={on ? {
              animationDelay: `${delay + filled.indexOf(i) * step}ms`,
              transformBox: 'fill-box',
              transformOrigin: 'center',
            } : undefined}
          />
        );
      })}
    </>
  );
}

/* ── isometric block ────────────────────────────────────────────────────────
   Three faces at fixed brightness. The top lit, the left mid, the right dark,
   which is the whole reason a voxel drawing reads as solid at a glance. */

interface BlockProps {
  /** Centre of the top face. */
  cx: number;
  cy: number;
  /** Half width and half height of the top rhombus. */
  hw: number;
  hh: number;
  /** How far it extrudes downward. */
  h: number;
  tone?: string;
  opacity?: number;
}

function Block({ cx, cy, hw, hh, h, tone = ACCENT, opacity = 1 }: BlockProps) {
  return (
    <g opacity={opacity}>
      <polygon points={`${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`} fill={tone} />
      <polygon points={`${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + h} ${cx - hw},${cy + h}`} fill={tone} opacity="0.62" />
      <polygon points={`${cx + hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + h} ${cx + hw},${cy + h}`} fill={tone} opacity="0.38" />
    </g>
  );
}

/** The ground a block stands on, so nothing floats without reason. */
function Shadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.34} fill="var(--color-bg-panel)" />;
}

function Arrow({ x, y, w = 26 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + w - 7} y2={y} stroke={EDGE} strokeWidth="1.5" strokeDasharray="3 3" className="oa-dash" />
      <polygon points={`${x + w - 7},${y - 4} ${x + w},${y} ${x + w - 7},${y + 4}`} fill={EDGE} />
    </g>
  );
}

const MUG = [7, 8, 9, 13, 16, 19, 20, 21];

/* ── the nine ───────────────────────────────────────────────────────────────*/

export function WelcomeArt() {
  return (
    <Frame>
      <Shadow cx={160} cy={92} rx={46} />
      <g transform="translate(160 44)">
        <g className="oa-sway">
          <Block cx={0} cy={0} hw={46} hh={23} h={26} />
          {/* The painted board on top is the thing the mark is about. */}
          <polygon points="0,-11.5 23,0 0,11.5 -23,0" fill="var(--color-bg-input)" opacity="0.45" />
        </g>
      </g>
    </Frame>
  );
}

export function DrawArt() {
  return (
    <Frame>
      <g transform="translate(125 26)">
        <Board filled={MUG} />
        {/* Two cells that are not squares, which is the point of the mode. */}
        <g className="oa-pop" style={{ animationDelay: '560ms', transformBox: 'fill-box', transformOrigin: 'center' }}>
          <polygon points="24,0 34.5,0 34.5,10.5" fill={ACCENT} />
        </g>
        <g className="oa-pop" style={{ animationDelay: '680ms', transformBox: 'fill-box', transformOrigin: 'center' }}>
          <path d="M60 10.5 A10.5 10.5 0 0 0 70.5 0 L70.5 10.5 Z" fill={ACCENT} />
        </g>
      </g>
    </Frame>
  );
}

export function DepthArt() {
  // Flat on the left, the same four cells standing on the right. The step is
  // about one becoming the other, so the drawing shows both.
  const heights = [10, 22, 34, 18];
  return (
    <Frame>
      <g transform="translate(62 32)">
        {heights.map((_, i) => (
          <rect key={i} x={0} y={i * 13} width="26" height="11.5" rx="1.5" fill={ACCENT} opacity={0.25 + i * 0.18} />
        ))}
      </g>
      <Arrow x={108} y={56} />
      <g transform="translate(175 34)">
        {heights.map((h, i) => (
          <g key={i} className="oa-grow" style={{ animationDelay: `${i * 100}ms` }}>
            <Block cx={i * 21} cy={i * 11} hw={21} hh={10.5} h={h} opacity={0.42 + i * 0.18} />
          </g>
        ))}
      </g>
    </Frame>
  );
}

export function ModelArt() {
  return (
    <Frame>
      <ellipse cx={160} cy={72} rx={62} ry={21} fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="4 5" className="oa-dash" />
      <Shadow cx={160} cy={72} rx={30} />
      <g transform="translate(160 40)">
        <g className="oa-sway">
          <Block cx={0} cy={0} hw={30} hh={15} h={22} />
          <Block cx={-15} cy={-8} hw={15} hh={7.5} h={10} opacity={0.9} />
        </g>
      </g>
    </Frame>
  );
}

export function SetArt() {
  // Three props of different shapes on one baseline, over the palette they all
  // draw from. The shared palette is the step.
  const props = [
    { cx: 94, hw: 24, h: 20 },
    { cx: 162, hw: 28, h: 30 },
    { cx: 230, hw: 20, h: 14 },
  ];
  return (
    <Frame>
      {props.map((p, i) => (
        <g key={i}>
          <Shadow cx={p.cx} cy={70} rx={p.hw * 0.85} />
          <g className="oa-pop" style={{ animationDelay: `${i * 130}ms`, transformBox: 'fill-box', transformOrigin: 'bottom' }}>
            <Block cx={p.cx} cy={54 - p.h} hw={p.hw} hh={p.hw / 2} h={p.h} />
          </g>
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <rect
          key={n}
          x={122 + n * 13}
          y={86}
          width="9"
          height="9"
          rx="2"
          fill={ACCENT}
          opacity={0.25 + n * 0.15}
          className="oa-pop"
          style={{ animationDelay: `${520 + n * 55}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
    </Frame>
  );
}

export function FramesArt() {
  // A filmstrip, because everyone already knows what one means.
  return (
    <Frame>
      <rect x="46" y="26" width="228" height="60" rx="4" fill={FILL} stroke={LINE} strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
        <g key={n}>
          <rect x={54 + n * 28} y={31} width="7" height="5" rx="1.5" fill={LINE} />
          <rect x={54 + n * 28} y={76} width="7" height="5" rx="1.5" fill={LINE} />
        </g>
      ))}
      {[0, 1, 2].map((n) => (
        <g key={n}>
          <rect
            x={58 + n * 74}
            y={41}
            width="66"
            height="30"
            rx="2"
            fill="var(--color-bg-input)"
            stroke={ACCENT}
            strokeWidth="1"
            className="oa-blink"
            style={{ animationDelay: `${n * 400}ms` }}
          />
          {/* One cell walking across the three frames. */}
          <rect x={68 + n * 74 + n * 14} y={50} width="12" height="12" rx="2" fill={ACCENT} className="oa-pop" style={{ animationDelay: `${n * 160}ms`, transformBox: 'fill-box', transformOrigin: 'center' }} />
        </g>
      ))}
    </Frame>
  );
}

export function SceneArt() {
  // An isometric ground plane with props standing on it. Standing rather than
  // lying flat is the thing people get wrong about the mode.
  return (
    <Frame>
      <polygon points="160,26 268,80 160,102 52,80" fill={FILL} stroke={LINE} strokeWidth="1" />
      {[-1, 0, 1].map((n) => (
        <g key={n} opacity="0.5">
          <line x1={160 + n * 27} y1={26 + Math.abs(n) * 0} x2={160 + n * 27 + 108} y2={80} stroke={LINE} strokeWidth="0.75" />
        </g>
      ))}
      {[
        { cx: 116, cy: 62, hw: 16, h: 16 },
        { cx: 160, cy: 50, hw: 20, h: 24 },
        { cx: 206, cy: 66, hw: 14, h: 12 },
      ].map((p, i) => (
        <g key={i}>
          <Shadow cx={p.cx} cy={p.cy + p.hw / 2 + p.h} rx={p.hw * 0.8} />
          <g className="oa-grow" style={{ animationDelay: `${180 + i * 150}ms` }}>
            <Block cx={p.cx} cy={p.cy} hw={p.hw} hh={p.hw / 2} h={p.h} opacity={1 - i * 0.18} />
          </g>
        </g>
      ))}
    </Frame>
  );
}

export function AssistantArt() {
  return (
    <Frame>
      <g transform="translate(44 34)">
        <rect x="0" y="0" width="112" height="44" rx="8" fill={FILL} stroke={LINE} strokeWidth="1" />
        <path d="M16 44 L16 54 L30 44 Z" fill={FILL} />
        {[0, 1, 2].map((n) => (
          <rect
            key={n}
            x="14"
            y={12 + n * 10}
            width={n === 2 ? 44 : 84}
            height="5"
            rx="2.5"
            fill={MUTED}
            className="oa-slide"
            style={{ animationDelay: `${n * 130}ms` }}
          />
        ))}
      </g>
      <Arrow x={166} y={56} w={22} />
      <g transform="translate(200 31)">
        <Board cell={11} cols={7} rows={5} filled={[8, 9, 10, 15, 18, 22, 23, 24]} delay={620} step={70} />
      </g>
    </Frame>
  );
}

export function ExportArt() {
  return (
    <Frame>
      <Shadow cx={71} cy={78} rx={26} />
      <g transform="translate(71 40)">
        <g className="oa-sway">
          <Block cx={0} cy={0} hw={26} hh={13} h={20} />
        </g>
      </g>
      <Arrow x={113} y={56} w={24} />
      {['OBJ', 'GLB', 'PNG'].map((label, i) => (
        <g key={label} transform={`translate(151 ${20 + i * 26})`}>
          <g className="oa-slide" style={{ animationDelay: `${420 + i * 110}ms` }}>
            <rect x="0" y="0" width="124" height="20" rx="4" fill={FILL} stroke={LINE} strokeWidth="1" />
            <rect x="9" y="6" width="8" height="8" rx="2" fill={ACCENT} opacity={1 - i * 0.28} />
            <text x="27" y="14" fill={MUTED} fontSize="10" fontFamily="monospace" letterSpacing="0.5">{label}</text>
          </g>
        </g>
      ))}
    </Frame>
  );
}
