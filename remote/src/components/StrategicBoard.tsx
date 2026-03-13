import React, { useState, useMemo, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type CommitStatus = 'Done' | 'Pending' | 'Bumped';

export interface Commit {
  id: string | number;
  taskName: string;
  chessPiece: PieceType;
  status: CommitStatus;
  definingObjective: string;
  contributor?: string;
}

interface StrategicBoardProps {
  commits?: Commit[];
  title?: string;
  weekLabel?: string;
  embedded?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   DEMO DATA
───────────────────────────────────────────────────────────── */
const DEMO_COMMITS: Commit[] = [
  { id: 1,  taskName: 'Refactor auth pipeline',     chessPiece: 'King',   status: 'Done',    definingObjective: 'Platform Stability',   contributor: 'Alex Chen'     },
  { id: 2,  taskName: 'Deploy staging env',          chessPiece: 'Rook',   status: 'Done',    definingObjective: 'Platform Stability',   contributor: 'Maya Ross'     },
  { id: 3,  taskName: 'Write OpenAPI docs',          chessPiece: 'Pawn',   status: 'Pending', definingObjective: 'Platform Stability',   contributor: 'Jordan Lee'    },
  { id: 4,  taskName: 'Rate limiting middleware',    chessPiece: 'Knight', status: 'Bumped',  definingObjective: 'Platform Stability',   contributor: 'Sasha Vance'   },
  { id: 5,  taskName: 'Q3 roadmap alignment',        chessPiece: 'Queen',  status: 'Done',    definingObjective: 'Growth Initiative',    contributor: 'Sam Park'      },
  { id: 6,  taskName: 'User interview series',       chessPiece: 'Bishop', status: 'Pending', definingObjective: 'Growth Initiative',    contributor: 'Riley Kim'     },
  { id: 7,  taskName: 'Competitor analysis',         chessPiece: 'Knight', status: 'Bumped',  definingObjective: 'Growth Initiative',    contributor: 'Morgan Wu'     },
  { id: 8,  taskName: 'Pricelist redesign',          chessPiece: 'Pawn',   status: 'Done',    definingObjective: 'Growth Initiative',    contributor: 'Taylor Voss'   },
  { id: 9,  taskName: 'Fix memory leak in worker',   chessPiece: 'Queen',  status: 'Done',    definingObjective: 'Technical Excellence', contributor: 'Blake Torres'  },
  { id: 10, taskName: 'Performance profiling',       chessPiece: 'Bishop', status: 'Pending', definingObjective: 'Technical Excellence', contributor: 'Casey Nguyen'  },
  { id: 11, taskName: 'Test coverage to 80%',        chessPiece: 'Pawn',   status: 'Bumped',  definingObjective: 'Technical Excellence', contributor: 'Drew Martinez' },
  { id: 12, taskName: 'Onboard new hires',           chessPiece: 'King',   status: 'Pending', definingObjective: 'Team Health',          contributor: 'Quinn Adams'   },
  { id: 13, taskName: 'Retro facilitation',          chessPiece: 'Rook',   status: 'Done',    definingObjective: 'Team Health',          contributor: 'Avery Singh'   },
  { id: 14, taskName: 'Skills matrix update',        chessPiece: 'Pawn',   status: 'Bumped',  definingObjective: 'Team Health',          contributor: 'Harper Liu'    },
];

/* ─────────────────────────────────────────────────────────────
   CSS INJECTION (fonts + keyframes — once per page)
───────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

@keyframes sb-materialize {
  0%   { opacity: 0; transform: scale(0.2); filter: blur(6px); }
  60%  { opacity: 1; filter: blur(0); }
  80%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes sb-fadein {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sb-tooltip-in {
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes sb-bar {
  from { width: 0; }
}
`;

function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById('sb-styles')) return;
    const style = document.createElement('style');
    style.id = 'sb-styles';
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);
}

/* ─────────────────────────────────────────────────────────────
   SVG CHESS PIECES
───────────────────────────────────────────────────────────── */
interface PieceIconProps { ghost?: boolean; style?: React.CSSProperties; }

const BASE: React.CSSProperties = { display: 'block', width: 42, height: 50 };
const ghostAttrs = {
  fill: 'none' as const, stroke: 'currentColor',
  strokeWidth: 1.1, strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const, strokeDasharray: '3.5 2',
};

function KingIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <rect x="20" y="1" width="4" height="15" rx="2" />
      <rect x="14" y="6.5" width="16" height="4" rx="2" />
      <path d="M11 19 C12 18 16 17 22 17 C28 17 32 18 33 19 L31 37 L13 37 Z" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}
function QueenIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <circle cx="5" cy="9" r="4" /><circle cx="22" cy="5" r="5" /><circle cx="39" cy="9" r="4" />
      <circle cx="13" cy="7" r="3" /><circle cx="31" cy="7" r="3" />
      <path d="M3 16 L41 16 L36 37 L8 37 Z" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}
function RookIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <rect x="5" y="2" width="9" height="12" rx="1.5" />
      <rect x="17.5" y="2" width="9" height="12" rx="1.5" />
      <rect x="30" y="2" width="9" height="12" rx="1.5" />
      <rect x="9" y="14" width="26" height="23" rx="1" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}
function BishopIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <circle cx="22" cy="8" r="6" /><circle cx="22" cy="2" r="2.5" />
      <path d="M14 18 Q22 12 30 18 L28 37 L16 37 Z" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}
function KnightIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <path d="M17 3 C11 3 8 9 9 14 C6 15 5 19 7 22 L12 24 C12 21 14 19 17 20 L25 18 C30 14 30 7 25 4 C23 3 20 3 17 3 Z" />
      <path d="M9 24 L13 37 L31 37 L30 24 Q22 28 9 24 Z" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}
function PawnIcon({ ghost, style }: PieceIconProps) {
  const g = ghost ? ghostAttrs : { fill: 'currentColor' as const };
  return (
    <svg viewBox="0 0 44 54" style={{ ...BASE, ...style }} {...g}>
      <circle cx="22" cy="9" r="8" />
      <path d="M15 21 Q14 30 13 37 L31 37 Q30 30 29 21 Q22 26 15 21 Z" />
      <rect x="10" y="37" width="24" height="6" rx="3" />
      <rect x="7" y="43" width="30" height="5" rx="2.5" />
    </svg>
  );
}

const PIECE_MAP: Record<PieceType, React.FC<PieceIconProps>> = {
  King: KingIcon, Queen: QueenIcon, Rook: RookIcon,
  Bishop: BishopIcon, Knight: KnightIcon, Pawn: PawnIcon,
};

/* ─────────────────────────────────────────────────────────────
   CHESS PIECE CELL
───────────────────────────────────────────────────────────── */
function ChessPiece({ commit, index }: { commit: Commit; index: number }) {
  const [hovered, setHovered] = useState(false);
  const PieceIcon = PIECE_MAP[commit.chessPiece];

  const isDone    = commit.status === 'Done';
  const isPending = commit.status === 'Pending';
  const isBumped  = commit.status === 'Bumped';
  const isElite   = commit.chessPiece === 'King' || commit.chessPiece === 'Queen';

  const color = isDone ? (isElite ? '#93d5ff' : '#dbeeff')
    : isBumped ? '#364153'
    : 'rgba(74,158,255,0.55)';

  const glow = isElite && isDone
    ? `drop-shadow(0 0 ${hovered ? 12 : 7}px rgba(147,213,255,${hovered ? 1 : 0.8})) drop-shadow(0 0 ${hovered ? 28 : 18}px rgba(56,189,248,${hovered ? 0.65 : 0.45}))`
    : 'none';

  const pieceStyle: React.CSSProperties = {
    color,
    filter: glow,
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.18s ease, filter 0.18s ease',
    transform: hovered && !isBumped
      ? 'scale(1.18) translateY(-5px)'
      : isBumped ? 'rotate(90deg)' : 'scale(1)',
    opacity: isBumped ? 0.5 : isPending ? 0.38 : 1,
    ...(isDone ? {
      animation: `sb-materialize 0.5s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.055}s both`,
    } : {}),
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '5px 7px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={pieceStyle}>
        {isBumped && (
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 48, height: 7,
            background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 72%)',
            borderRadius: '50%',
          }} />
        )}
        <PieceIcon ghost={isPending} />
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)',
          left: '50%',
          zIndex: 200, pointerEvents: 'none',
          minWidth: 175, maxWidth: 215,
          animation: 'sb-tooltip-in 0.13s ease both',
        }}>
          <div style={{
            background: 'linear-gradient(155deg, #0f2044 0%, #081424 100%)',
            border: '1px solid rgba(201,168,76,0.38)',
            borderRadius: 8, padding: '11px 14px',
            boxShadow: '0 12px 44px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontFamily: '"Cinzel",serif', fontSize: 8.5, letterSpacing: '0.2em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: 5 }}>
              {commit.chessPiece}
            </div>
            <div style={{ fontFamily: '"Rajdhani",sans-serif', fontSize: 13.5, fontWeight: 600, color: '#dff0ff', lineHeight: 1.35, marginBottom: 7 }}>
              {commit.taskName}
            </div>
            {commit.contributor && (
              <div style={{ fontFamily: '"Space Mono",monospace', fontSize: 10, color: '#5a87b4', marginBottom: 8 }}>
                ↳ {commit.contributor}
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#4ade80' : isPending ? '#60a5fa' : '#6b7280',
                boxShadow: isDone ? '0 0 8px rgba(74,222,128,0.7)' : 'none',
              }} />
              <span style={{ fontFamily: '"Rajdhani",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: isDone ? '#4ade80' : isPending ? '#60a5fa' : '#9ca3af', textTransform: 'uppercase' }}>
                {commit.status}
              </span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid rgba(201,168,76,0.38)' }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BOARD SECTION
───────────────────────────────────────────────────────────── */
function BoardSection({ objective, commits, sectionIndex }: { objective: string; commits: Commit[]; sectionIndex: number }) {
  const done    = commits.filter(c => c.status === 'Done').length;
  const total   = commits.length;
  const pct     = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div style={{
      background: 'linear-gradient(150deg, rgba(13,26,46,0.82) 0%, rgba(8,15,30,0.92) 100%)',
      border: '1px solid rgba(201,168,76,0.18)',
      borderRadius: 4, position: 'relative', overflow: 'visible',
      animation: `sb-fadein 0.38s ease ${sectionIndex * 0.08}s both`,
    }}>
      {/* Corner brackets */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <div key={c} style={{
          position: 'absolute',
          [c.includes('t') ? 'top' : 'bottom']: -2,
          [c.includes('l') ? 'left' : 'right']: -2,
          width: 11, height: 11,
          borderTop:    c.includes('t') ? '2px solid rgba(201,168,76,0.65)' : 'none',
          borderBottom: c.includes('b') ? '2px solid rgba(201,168,76,0.65)' : 'none',
          borderLeft:   c.includes('l') ? '2px solid rgba(201,168,76,0.65)' : 'none',
          borderRight:  c.includes('r') ? '2px solid rgba(201,168,76,0.65)' : 'none',
        }} />
      ))}

      {/* Header */}
      <div style={{ padding: '14px 18px 11px', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: '"Cinzel",serif', fontSize: 8.5, letterSpacing: '0.22em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>Objective</div>
          <div style={{ fontFamily: '"Cinzel",serif', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.1em', color: '#d4a017', textTransform: 'uppercase', lineHeight: 1.3 }}>
            {objective}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: '"Space Mono",monospace', fontSize: 20, fontWeight: 700, lineHeight: 1, color: allDone ? '#4ade80' : '#93d5ff', textShadow: allDone ? '0 0 14px rgba(74,222,128,0.5)' : 'none' }}>
            {done}<span style={{ fontSize: 11, color: 'rgba(147,213,255,0.35)' }}>/{total}</span>
          </div>
          <div style={{ width: 58, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${pct}%`,
              background: allDone ? 'linear-gradient(90deg,#4ade80,#86efac)' : 'linear-gradient(90deg,#3b82f6,#93d5ff)',
              animation: `sb-bar 0.55s ease ${sectionIndex * 0.08 + 0.35}s both`,
            }} />
          </div>
        </div>
      </div>

      {/* Pieces */}
      <div style={{ padding: '14px 10px 12px', display: 'flex', flexWrap: 'wrap', gap: 2, minHeight: 92 }}>
        {commits.map((commit, i) => <ChessPiece key={commit.id} commit={commit} index={i} />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEGEND
───────────────────────────────────────────────────────────── */
function Legend() {
  const items = [
    { status: 'Done' as const,    color: '#dbeeff', label: 'Done',    desc: 'Committed & Delivered', ghost: false },
    { status: 'Pending' as const, color: 'rgba(74,158,255,0.55)', label: 'Pending', desc: 'In Progress', ghost: true },
    { status: 'Bumped' as const,  color: '#364153', label: 'Bumped',  desc: 'Deferred Next Week', ghost: false },
  ];
  return (
    <div style={{ display: 'flex', gap: 28, justifyContent: 'center', paddingTop: 22, borderTop: '1px solid rgba(201,168,76,0.1)', marginTop: 6, flexWrap: 'wrap' }}>
      {items.map(({ status, color, label, desc, ghost }) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 24, height: 29, color, opacity: status === 'Bumped' ? 0.5 : 1, transform: status === 'Bumped' ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
            <PawnIcon ghost={ghost} style={{ width: 24, height: 29 }} />
          </div>
          <div>
            <div style={{ fontFamily: '"Rajdhani",sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: status === 'Done' ? '#93d5ff' : status === 'Pending' ? '#5a87b4' : '#6b7280' }}>{label}</div>
            <div style={{ fontFamily: '"Rajdhani",sans-serif', fontSize: 10.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.3 }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export function StrategicBoard({ commits = DEMO_COMMITS, title = 'Strategic Board', weekLabel, embedded = false }: StrategicBoardProps) {
  useGlobalStyles();

  const sections = useMemo(() => {
    const map = new Map<string, Commit[]>();
    for (const c of commits) {
      const list = map.get(c.definingObjective) ?? [];
      list.push(c);
      map.set(c.definingObjective, list);
    }
    return Array.from(map.entries());
  }, [commits]);

  const totalDone    = commits.filter(c => c.status === 'Done').length;
  const totalPending = commits.filter(c => c.status === 'Pending').length;
  const totalBumped  = commits.filter(c => c.status === 'Bumped').length;

  const dateLabel = weekLabel ?? (() => {
    const now = new Date();
    const dow = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - dow.getTime()) / 86400000 + dow.getDay() + 1) / 7);
    return `WEEK ${week} · ${now.getFullYear()}`;
  })();

  const cols = sections.length <= 2 ? 2 : sections.length === 3 ? 3 : 2;

  return (
    <div style={{
      background: `repeating-conic-gradient(rgba(18,36,64,0.055) 0% 25%, transparent 0% 50%) 0 0 / 64px 64px, linear-gradient(155deg,#060d1f 0%,#040a18 55%,#030810 100%)`,
      ...(embedded ? { borderRadius: 12, overflow: 'hidden' } : { minHeight: '100vh' }),
      padding: embedded ? '28px 24px' : '44px 36px',
      position: 'relative',
      fontFamily: '"Rajdhani",sans-serif',
    }}>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 42, textAlign: 'center', animation: 'sb-fadein 0.48s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ flex: 1, maxWidth: 220, height: 1, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5))' }} />
            <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(201,168,76,0.65)">
              <polygon points="7,0 8.8,5.2 14,5.2 9.6,8.4 11.4,13.6 7,10.4 2.6,13.6 4.4,8.4 0,5.2 5.2,5.2" />
            </svg>
            <div style={{ flex: 1, maxWidth: 220, height: 1, background: 'linear-gradient(90deg,rgba(201,168,76,0.5),transparent)' }} />
          </div>

          <div style={{ fontFamily: '"Cinzel",serif', fontSize: 10.5, letterSpacing: '0.38em', color: 'rgba(201,168,76,0.52)', textTransform: 'uppercase', marginBottom: 9 }}>
            Weekly Commit — {dateLabel}
          </div>
          <h1 style={{ fontFamily: '"Cinzel",serif', fontSize: 34, fontWeight: 700, letterSpacing: '0.16em', color: '#ecf4ff', textTransform: 'uppercase', margin: 0, textShadow: '0 0 50px rgba(147,213,255,0.14)' }}>
            {title}
          </h1>

          <div style={{ display: 'flex', gap: 36, justifyContent: 'center', marginTop: 22 }}>
            {[
              { value: totalDone,    label: 'Deployed', glow: '0 0 18px rgba(74,222,128,0.45)', color: '#4ade80' },
              { value: totalPending, label: 'In Flight', glow: 'none', color: '#60a5fa' },
              { value: totalBumped,  label: 'Deferred',  glow: 'none', color: '#6b7280' },
            ].map(({ value, label, glow, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Space Mono",monospace', fontSize: 26, fontWeight: 700, lineHeight: 1, color, textShadow: glow }}>
                  {value}
                </div>
                <div style={{ fontFamily: '"Cinzel",serif', fontSize: 8, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginTop: 5 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginTop: 24 }}>
            <div style={{ flex: 1, maxWidth: 320, height: 1, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.22))' }} />
            <div style={{ width: 5, height: 5, background: 'rgba(201,168,76,0.45)', transform: 'rotate(45deg)' }} />
            <div style={{ flex: 1, maxWidth: 320, height: 1, background: 'linear-gradient(90deg,rgba(201,168,76,0.22),transparent)' }} />
          </div>
        </header>

        {/* BOARD */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 3,
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 6, padding: 3,
          background: 'rgba(201,168,76,0.04)',
        }}>
          {sections.map(([objective, sectionCommits], i) => (
            <BoardSection key={objective} objective={objective} commits={sectionCommits} sectionIndex={i} />
          ))}
        </div>

        <Legend />

        <div style={{ textAlign: 'center', marginTop: 26, fontFamily: '"Space Mono",monospace', fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.13)', textTransform: 'uppercase' }}>
          Foundry Command // Strategic Intelligence Suite
        </div>
      </div>
    </div>
  );
}

export default StrategicBoard;
