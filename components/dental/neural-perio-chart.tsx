/**
 * Neural Perio Chart — Next-Generation Periodontal Visualization v3
 *
 * Features added in v3:
 *   • Lingual (L) as 4th measurement site per tooth
 *   • Click any tooth → zoom overlay (expanded single-tooth view + editor)
 *   • Exam history comparison: ghost bars show a previous exam's values
 *   • Print/export button (opens new window and triggers browser print)
 *   • leadId + onSave props to persist edits via /api/dental/periodontal
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Download, History, X, Check, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdSite  { pd: number; bop?: boolean }
interface ToothData { mesial?: PdSite; buccal?: PdSite; distal?: PdSite; lingual?: PdSite }

interface ExamSession { id: string; date: string; measurements: Record<string, ToothData> }

interface NeuralPerioChartProps {
  measurements?: Record<string, ToothData>;
  leadId?: string;
  onSave?: (data: Record<string, ToothData>) => Promise<void>;
}

// ─── Demo data (all 32 teeth, now with lingual) ───────────────────────────────

// Realistic healthy-adult fallback — matches DB seed for orthodontic patients.
// PD 2-3mm throughout, isolated BOP on teeth 6M, 11M, 22B, 27B (mild gingivitis).
const DEMO: Record<string, ToothData> = (() => {
  const m: Record<string, ToothData> = {};
  const bopSites: Record<number, (keyof ToothData)[]> = {
    6: ['mesial'], 11: ['mesial'], 22: ['buccal'], 27: ['buccal'],
  };
  for (let t = 1; t <= 32; t++) {
    const pd = (t % 4 === 0) ? 3 : 2;
    const bops = bopSites[t] || [];
    m[String(t)] = {
      mesial:  { pd, bop: bops.includes('mesial') },
      buccal:  { pd, bop: bops.includes('buccal') },
      distal:  { pd: pd === 3 ? 3 : 2, bop: false },
      lingual: { pd: 2, bop: false },
    };
  }
  return m;
})();

const UPPER = Array.from({length:16},(_,i)=>i+1);
const LOWER = Array.from({length:16},(_,i)=>i+17);

const PX_PER_MM = 7;
const MAX_BAR   = 70;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TT = 'molar'|'premolar'|'canine'|'incisor';

function toothType(n:number): TT {
  const x = ((n-1)%16)+1;
  if (x<=3||x>=14) return 'molar';
  if (x<=5||x>=12) return 'premolar';
  if (x===6||x===11) return 'canine';
  return 'incisor';
}

// Min column width = 4 bars × 3px + 3 gaps × 1px = 15px
// Match the new wider anatomical path dimensions
const TW: Record<TT,number> = { molar:34, premolar:24, canine:20, incisor:22 };

function pdColor(pd:number)     { return pd<=3?'#10b981':pd<=6?'#f59e0b':'#ef4444' }
function pdGlowRgba(pd:number)  { return pd<=3?'rgba(16,185,129,0.75)':pd<=6?'rgba(245,158,11,0.75)':'rgba(239,68,68,0.85)' }
function worst(d:ToothData)     { return Math.max(d.mesial?.pd??0, d.buccal?.pd??0, d.distal?.pd??0, d.lingual?.pd??0) }

const ALL_SITES: Array<{ key: keyof ToothData; label: string }> = [
  { key:'mesial',  label:'M' },
  { key:'buccal',  label:'B' },
  { key:'distal',  label:'D' },
  { key:'lingual', label:'L' },
];

// ─── Tooth crown SVG paths ────────────────────────────────────────────────────
// All teeth viewed from labial (anterior) / buccal (posterior).
// Upper → occlusal/incisal at top (y≈0), gingival at bottom.
// Lower → gingival at top (y≈0), occlusal at bottom.

function toothPath(t: TT, isUpper: boolean): { d: string; w: number; h: number } {

  if (t === 'molar') {
    // 34×28 — two prominent buccal cusps separated by a buccal groove
    const u = `
      M 3,27 C 0,26 0,23 0,19 L 0,14
      C 0,10 1,8 4,7
      C 5,4 7,1 10,0 C 12,-1 14,0 14,3
      C 14,5 14,7 15,9
      C 16,7 17,4 19,1 C 21,-1 24,0 24,3
      C 25,6 27,8 30,9
      C 32,9 34,11 34,15 L 34,21
      C 34,25 32,27 29,27 Z`;
    const l = `
      M 3,0 C 0,1 0,4 0,8 L 0,14
      C 0,18 1,20 4,21
      C 5,24 7,27 10,28 C 12,29 14,28 14,25
      C 14,23 14,21 15,19
      C 16,21 17,24 19,27 C 21,29 24,28 24,25
      C 25,22 27,20 30,19
      C 32,19 34,17 34,13 L 34,7
      C 34,3 32,0 29,0 Z`;
    return { d: isUpper ? u : l, w: 34, h: 28 };
  }

  if (t === 'premolar') {
    // 24×26 — two cusps (buccal slightly taller), distinct valley
    const u = `
      M 2,25 C 0,25 0,22 0,19 L 0,13
      C 0,9 1,7 4,6
      C 5,4 6,1 9,0 C 11,-1 12,0 12,3
      C 12,6 12,8 13,10
      C 14,8 15,5 16,2 C 18,-1 20,0 21,3
      C 22,6 23,9 24,13 L 24,19
      C 24,23 23,25 21,25 Z`;
    const l = `
      M 2,0 C 0,0 0,3 0,6 L 0,12
      C 0,16 1,18 4,19
      C 5,21 6,24 9,26 C 11,27 12,26 12,23
      C 12,20 12,18 13,16
      C 14,18 15,21 16,24 C 18,27 20,26 21,23
      C 22,20 23,17 24,13 L 24,7
      C 24,3 23,0 21,0 Z`;
    return { d: isUpper ? u : l, w: 24, h: 26 };
  }

  if (t === 'canine') {
    // 18×34 — single elongated cusp, pronounced tip, long crown
    const u = `
      M 1,33 C 0,32 0,30 0,27 L 0,16
      C 0,12 1,10 4,9
      C 6,7 8,3 9,0
      C 10,-1 11,0 10,3
      C 10,6 11,9 13,10
      C 15,10 17,12 18,16 L 18,27
      C 18,31 17,33 15,33 Z`;
    const l = `
      M 1,0 C 0,1 0,3 0,6 L 0,17
      C 0,21 1,23 4,24
      C 6,26 8,30 9,33
      C 10,34 11,33 10,30
      C 10,27 11,24 13,23
      C 15,23 17,21 18,17 L 18,6
      C 18,2 17,0 15,0 Z`;
    return { d: isUpper ? u : l, w: 18, h: 34 };
  }

  // incisor — 22×26, wide flat incisal edge with rounded disto-incisal angle
  const u = `
    M 2,25 C 0,25 0,23 0,21 L 0,5
    C 0,2 2,0 5,0 L 17,0
    C 20,0 22,2 22,6 L 22,20
    C 22,23 21,25 19,25 Z`;
  const l = `
    M 2,0 C 0,0 0,2 0,5 L 0,20
    C 0,23 2,25 5,25 L 17,25
    C 20,25 22,23 22,20 L 22,5
    C 22,2 21,0 19,0 Z`;
  return { d: isUpper ? u : l, w: 22, h: 26 };
}

// ─── Crown SVG — realistic enamel rendering ────────────────────────────────────
// Warm ivory/cream palette + 3-layer shading to simulate convex enamel surface.
// Health status is communicated via colored drop-shadow glow only (tooth itself
// stays anatomically ivory so clinical color-coding doesn't confuse shade).

function CrownSvg({
  num, isUpper, td, isSelected, scale: scaleProp = 1,
}: { num:number; isUpper:boolean; td:ToothData; isSelected?:boolean; scale?:number }) {
  const t   = toothType(num);
  const wpd = worst(td);
  const col = pdColor(wpd);
  const glw = pdGlowRgba(wpd);
  const scale = scaleProp;

  // Unique gradient IDs per tooth
  const baseId = `eb${num}`;  // enamel base (radial — simulates 3-D convexity)
  const shineId = `es${num}`; // enamel shine (linear — labial highlight strip)
  const rimId  = `er${num}`;  // cervical rim tint

  const { d, w, h } = toothPath(t, isUpper);

  // Anatomical detail lines (grooves/ridges) depend on tooth type + arch
  const grooveY1 = isUpper ? h * 0.28 : h * 0.72;
  const grooveY2 = isUpper ? h * 0.72 : h * 0.28;

  return (
    <svg
      width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}
      style={{
        display:'block', overflow:'visible',
        filter: isSelected
          ? `drop-shadow(0 0 7px rgba(129,140,248,1)) drop-shadow(0 0 18px rgba(129,140,248,0.7))`
          : `drop-shadow(0 0 5px ${glw}) drop-shadow(0 0 13px ${glw})`,
      }}
    >
      <defs>
        {/* Radial gradient — bright top-left (light source) → warm ivory edges */}
        <radialGradient id={baseId} cx="30%" cy="22%" r="78%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#fffef6" />
          <stop offset="22%"  stopColor="#f8f0dc" />
          <stop offset="55%"  stopColor="#ede1bf" />
          <stop offset="82%"  stopColor="#dfd0a4" />
          <stop offset="100%" stopColor="#cec090" />
        </radialGradient>

        {/* Linear shine — enamel specular highlight strip, mesial-third */}
        <linearGradient id={shineId} x1="8%" y1="5%" x2="55%" y2="85%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.80)" />
          <stop offset="35%"  stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>

        {/* Cervical rim — slightly warmer at gum margin */}
        <linearGradient id={rimId}
          x1="0%" y1={isUpper?'100%':'0%'}
          x2="0%" y2={isUpper?'80%':'20%'}
        >
          <stop offset="0%"   stopColor="rgba(180,148,80,0.22)" />
          <stop offset="100%" stopColor="rgba(180,148,80,0.00)" />
        </linearGradient>
      </defs>

      {/* Layer 1 — base enamel fill (ivory 3-D radial) */}
      <path
        d={d}
        fill={`url(#${baseId})`}
        stroke={isSelected ? '#818cf8' : '#b8a870'}
        strokeWidth={isSelected ? 1.8 : 0.9}
        strokeLinejoin="round"
      />

      {/* Layer 2 — cervical warmth (cementoenamel junction tint) */}
      <path d={d} fill={`url(#${rimId})`} stroke="none" />

      {/* Layer 3 — enamel specular shine */}
      <path d={d} fill={`url(#${shineId})`} stroke="none" opacity="0.55" />

      {/* ── Anatomical detail lines ── */}

      {/* Molars: central buccal groove + subtle distal fossa hint */}
      {t === 'molar' && (
        <>
          <line
            x1={w * 0.455} y1={grooveY1}
            x2={w * 0.455} y2={grooveY2}
            stroke="rgba(140,112,60,0.28)" strokeWidth="0.9" strokeLinecap="round"
          />
          <line
            x1={w * 0.20} y1={grooveY1}
            x2={w * 0.36} y2={isUpper ? grooveY1 + h*0.15 : grooveY1 - h*0.15}
            stroke="rgba(140,112,60,0.14)" strokeWidth="0.6" strokeLinecap="round"
          />
          <line
            x1={w * 0.65} y1={grooveY1}
            x2={w * 0.80} y2={isUpper ? grooveY1 + h*0.12 : grooveY1 - h*0.12}
            stroke="rgba(140,112,60,0.14)" strokeWidth="0.6" strokeLinecap="round"
          />
        </>
      )}

      {/* Premolars: central developmental groove */}
      {t === 'premolar' && (
        <line
          x1={w * 0.54} y1={grooveY1}
          x2={w * 0.54} y2={grooveY2}
          stroke="rgba(140,112,60,0.25)" strokeWidth="0.8" strokeLinecap="round"
        />
      )}

      {/* Canine: labial ridge highlight line */}
      {t === 'canine' && (
        <line
          x1={w * 0.50} y1={isUpper ? h * 0.05 : h * 0.95}
          x2={w * 0.50} y2={isUpper ? h * 0.60 : h * 0.40}
          stroke="rgba(255,255,255,0.28)" strokeWidth="1.0" strokeLinecap="round"
        />
      )}

      {/* Incisors: incisal edge translucency line + mamelons hint */}
      {t === 'incisor' && (
        <>
          <line
            x1={w * 0.12} y1={isUpper ? h * 0.06 : h * 0.94}
            x2={w * 0.88} y2={isUpper ? h * 0.06 : h * 0.94}
            stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round"
          />
          {/* Three subtle mamelon bumps along incisal edge */}
          {[0.28, 0.50, 0.72].map((x, i) => (
            <circle
              key={i}
              cx={w * x} cy={isUpper ? h * 0.06 : h * 0.94}
              r={1.4}
              fill="rgba(255,255,255,0.22)" stroke="none"
            />
          ))}
        </>
      )}

      {/* Tooth number — warm amber, matches ivory palette */}
      <text
        x={w / 2} y={isUpper ? h * 0.62 : h * 0.42}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="5.5" fill="rgba(110,85,30,0.55)" fontFamily="monospace" fontWeight="bold"
      >{num}</text>
    </svg>
  );
}

// ─── Depth bar (M / B / D / L) ───────────────────────────────────────────────

const SITE_FULL_NAMES: Record<string, string> = { M:'Mesial', B:'Buccal', D:'Distal', L:'Lingual' };

function PdBar({
  pd, bop, comparePd, isUpper, label, zoomed,
}: { pd:number; bop?:boolean; comparePd?:number; isUpper:boolean; label:string; zoomed?:boolean }) {
  const scale = zoomed ? 2.2 : 1;
  const barW  = zoomed ? 10 : 3;
  const pxMm  = PX_PER_MM * scale;
  const maxB  = MAX_BAR * scale;
  const h     = Math.min(Math.max(pd * pxMm, 8), maxB);
  const ch    = comparePd ? Math.min(Math.max(comparePd * pxMm, 8), maxB) : 0;
  const col   = pdColor(pd);
  const glw   = pdGlowRgba(pd);
  const isL   = label === 'L';

  return (
    <div style={{
      width: barW, height: maxB, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:isUpper?'flex-start':'flex-end', position:'relative',
    }}>
      {/* Ghost bar from previous exam */}
      {comparePd && ch > 0 && (
        <div style={{
          position:'absolute',
          [isUpper?'top':'bottom']: 0,
          left:'50%', transform:'translateX(-50%)',
          width: zoomed ? 14 : 7, height: ch,
          border:`${zoomed ? 2 : 1.5}px solid ${pdColor(comparePd)}`,
          borderRadius: isUpper ? '0 0 4px 4px' : '4px 4px 0 0',
          opacity:0.45,
          pointerEvents:'none',
          zIndex:1,
        }} />
      )}

      {/* Main bar */}
      <div style={{
        width: barW, height: h, position:'relative', flexShrink:0, zIndex:2,
        background:isL
          ? `linear-gradient(${isUpper?'180deg':'0deg'}, ${col}cc, ${col}40)`
          : `linear-gradient(${isUpper?'180deg':'0deg'}, ${col}, ${col}45)`,
        boxShadow:`0 0 ${zoomed ? 10 : 5}px ${glw}, 0 0 1px ${col}`,
        borderRadius: isUpper ? '0 0 3px 3px' : '3px 3px 0 0',
        opacity: isL ? 0.8 : 1,
      }}>
        {bop && (
          <div style={{
            position:'absolute',
            [isUpper?'top':'bottom']: zoomed ? -8 : -4,
            left:'50%', transform:'translateX(-50%)',
            width: zoomed ? 14 : 7, height: zoomed ? 18 : 9,
            background:`radial-gradient(ellipse at 50% 40%, #ff4444 40%, #cc0000 100%)`,
            clipPath:'polygon(50% 100%, 0% 0%, 100% 0%)',
            filter:'drop-shadow(0 0 4px rgba(255,50,50,0.9))',
            zIndex:3,
          }} />
        )}
        <span style={{
          position:'absolute',
          [isUpper?'bottom':'top']: zoomed ? 'calc(100% + 6px)' : 'calc(100% + 3px)',
          left:'50%', transform:'translateX(-50%)',
          fontSize: zoomed ? 14 : 6, color:col, fontFamily:'"SF Mono",monospace', fontWeight:800,
          lineHeight:1, whiteSpace:'nowrap',
        }}>{pd || '–'}</span>
      </div>

      <span style={{
        fontSize: zoomed ? 10 : 4.5, color: isL ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.5)',
        fontFamily:'monospace',
        marginTop: isUpper ? (zoomed ? 4 : 1) : 0, marginBottom: isUpper ? 0 : (zoomed ? 4 : 1),
        fontStyle: isL ? 'italic' : 'normal',
      }}>
        {zoomed ? SITE_FULL_NAMES[label] || label : label}
      </span>
    </div>
  );
}

// ─── Full tooth column ────────────────────────────────────────────────────────

function ToothColumn({
  num, isUpper, td, compareData, isSelected, onClick, zoomed,
}: {
  num:number; isUpper:boolean; td:ToothData;
  compareData?: ToothData; isSelected?:boolean; onClick:()=>void; zoomed?:boolean;
}) {
  const t    = toothType(num);
  const col  = pdColor(worst(td));
  const glow = pdGlowRgba(worst(td));

  return (
    <div
      onClick={onClick}
      title={`Tooth ${num} — click to zoom in`}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        flex: zoomed ? undefined : '1 1 0%',
        minWidth: zoomed ? TW[t] : 0,
        cursor:'pointer',
        transition:'transform 0.15s',
        ...(isSelected ? { transform:'scale(1.06)' } : {}),
      }}
    >
      {isUpper ? (
        <>
          <CrownSvg num={num} isUpper td={td} isSelected={isSelected} scale={zoomed ? 2.5 : 1} />
          <div style={{
            width:'80%', height: zoomed ? 6 : 3, background:col,
            boxShadow:`0 0 8px ${glow}, 0 0 2px ${col}`,
            margin: zoomed ? '6px 0 4px' : '3px 0 2px', borderRadius:2,
          }} />
          <div style={{ display:'flex', gap: zoomed ? 6 : 1, justifyContent:'center' }}>
            {ALL_SITES.map(s=>(
              <PdBar
                key={s.key} pd={td[s.key]?.pd??0} bop={td[s.key]?.bop}
                comparePd={compareData?.[s.key]?.pd}
                isUpper label={s.label} zoomed={zoomed}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display:'flex', gap: zoomed ? 6 : 1, justifyContent:'center' }}>
            {ALL_SITES.map(s=>(
              <PdBar
                key={s.key} pd={td[s.key]?.pd??0} bop={td[s.key]?.bop}
                comparePd={compareData?.[s.key]?.pd}
                isUpper={false} label={s.label} zoomed={zoomed}
              />
            ))}
          </div>
          <div style={{
            width:'80%', height: zoomed ? 6 : 3, background:col,
            boxShadow:`0 0 8px ${glow}, 0 0 2px ${col}`,
            margin: zoomed ? '4px 0 6px' : '2px 0 3px', borderRadius:2,
          }} />
          <CrownSvg num={num} isUpper={false} td={td} isSelected={isSelected} scale={zoomed ? 2.5 : 1} />
        </>
      )}
    </div>
  );
}

// ─── Tooth editor panel ───────────────────────────────────────────────────────

function ToothEditor({
  num, values, saving,
  onChange, onSave, onClose,
}: {
  num: number;
  values: ToothData;
  saving: boolean;
  onChange: (site: keyof ToothData, field: 'pd'|'bop', value: number|boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const t = toothType(num);
  const worst = Math.max(values.mesial?.pd??0, values.buccal?.pd??0, values.distal?.pd??0, values.lingual?.pd??0);
  const col = pdColor(worst || 2);

  return (
    <div style={{
      marginTop:10, borderRadius:10, padding:'12px 16px',
      background:'rgba(8,13,34,0.97)',
      border:`1px solid ${col}55`,
      boxShadow:`0 0 20px ${col}20`,
      position:'relative',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:10, color:'#a5b4fc', fontFamily:'monospace', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>
          Tooth {num} · {t} · Edit Measurements
        </span>
        <button
          onClick={onClose}
          style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:2, lineHeight:1 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Site inputs */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {ALL_SITES.map(({ key, label }) => {
          const site = values[key];
          const pd   = site?.pd ?? 0;
          const bop  = site?.bop ?? false;
          const sc   = pdColor(pd || 2);
          return (
            <div key={key} style={{
              display:'flex', flexDirection:'column', gap:6,
              padding:'8px 10px', borderRadius:7, minWidth:90,
              background:`${sc}12`,
              border:`1px solid ${sc}35`,
            }}>
              <span style={{ fontSize:8.5, color:sc, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>
                {label} — {key}
              </span>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:7, color:'#64748b' }}>PD (mm)</span>
                  <input
                    type="number" min={0} max={12} step={1}
                    value={pd || ''}
                    onChange={e => onChange(key, 'pd', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    style={{
                      width:44, padding:'3px 5px', fontSize:12, textAlign:'center',
                      background:'rgba(15,23,42,0.9)',
                      border:`1px solid ${sc}55`,
                      borderRadius:5, color:'#e2e8f0', outline:'none',
                      fontFamily:'monospace', fontWeight:700,
                    }}
                  />
                </div>
                <label style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:7, color:'#ef4444' }}>BOP</span>
                  <input
                    type="checkbox"
                    checked={bop}
                    onChange={e => onChange(key, 'bop', e.target.checked)}
                    style={{ cursor:'pointer', accentColor:'#ef4444' }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button
          onClick={onSave} disabled={saving}
          style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'5px 14px', borderRadius:6, fontSize:10,
            background: saving ? '#374151' : '#4f46e5',
            color:'#e0e7ff', border:'none', cursor: saving ? 'default' : 'pointer',
            fontFamily:'monospace', fontWeight:700, letterSpacing:0.5,
          }}
        >
          <Check size={11} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding:'5px 12px', borderRadius:6, fontSize:10,
            background:'rgba(100,116,139,0.15)', color:'#94a3b8',
            border:'1px solid rgba(100,116,139,0.3)', cursor:'pointer',
            fontFamily:'monospace',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Zoomed single-tooth overlay ──────────────────────────────────────────────

function ZoomedToothOverlay({
  num, td, compareData, editValues, saving,
  onChange, onSave, onClose,
}: {
  num: number;
  td: ToothData;
  compareData?: ToothData | null;
  editValues: ToothData;
  saving: boolean;
  onChange: (site: keyof ToothData, field: 'pd'|'bop', value: number|boolean) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const isUpper = num <= 16;

  return (
    <div
      style={{
        position:'absolute', inset:0, zIndex:50,
        background:'rgba(6,11,26,0.92)',
        backdropFilter:'blur(8px)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
        padding:'20px 16px 24px',
        borderRadius:14,
      }}
    >
      {/* Header: Back + title */}
      <div style={{ display:'flex', alignItems:'center', gap:12, width:'100%', marginBottom:16 }}>
        <button
          onClick={onClose}
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px', borderRadius:8, fontSize:11,
            background:'rgba(99,102,241,0.2)', color:'#a5b4fc',
            border:'1px solid rgba(129,140,248,0.4)', cursor:'pointer',
            fontFamily:'monospace', fontWeight:600,
          }}
        >
          <ArrowLeft size={14} /> Back to chart
        </button>
        <span style={{ fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>
          Tooth {num} · {toothType(num)} · {isUpper ? 'Maxillary' : 'Mandibular'}
        </span>
      </div>

      {/* Large tooth + bars (shows editValues for live preview while editing) */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
        <ToothColumn
          num={num}
          isUpper={isUpper}
          td={editValues}
          compareData={compareData ?? undefined}
          isSelected
          zoomed
          onClick={() => {}}
        />
      </div>

      {/* Edit panel */}
      <div style={{ width:'100%', maxWidth:480 }}>
        <ToothEditor
          num={num}
          values={editValues}
          saving={saving}
          onChange={onChange}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function NeuralPerioChart({ measurements, leadId, onSave }: NeuralPerioChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // ── Local editable data ──
  const [localData, setLocalData]     = useState<Record<string, ToothData>>({});

  // ── Tooth editor ──
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [editValues, setEditValues]       = useState<ToothData>({});
  const [saving, setSaving]               = useState(false);

  // ── Exam history + comparison ──
  const [examHistory, setExamHistory]   = useState<ExamSession[]>([]);
  const [compareId, setCompareId]       = useState<string>('');
  const [showHistory, setShowHistory]   = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // ── Initialize from prop ──
  useEffect(() => {
    const d = measurements && Object.keys(measurements).length > 0 ? measurements : DEMO;
    setLocalData(d);
  }, [measurements]);

  // ── Fetch exam history when leadId is provided ──
  useEffect(() => {
    if (!leadId) return;
    setFetchingHistory(true);
    fetch(`/api/dental/periodontal?leadId=${leadId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.charts)) {
          setExamHistory(
            data.charts.map((c: any) => ({
              id:           c.id,
              date:         c.chartDate ?? c.createdAt,
              measurements: c.measurements ?? {},
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setFetchingHistory(false));
  }, [leadId]);

  const compareData = compareId
    ? examHistory.find(e => e.id === compareId)?.measurements ?? null
    : null;

  // ── Tooth click ──
  const handleToothClick = useCallback((num: number) => {
    if (selectedTooth === num) { setSelectedTooth(null); return; }
    setSelectedTooth(num);
    setEditValues(localData[num.toString()] ?? {});
  }, [selectedTooth, localData]);

  // ── Edit a site value ──
  const handleSiteChange = (site: keyof ToothData, field: 'pd'|'bop', value: number|boolean) => {
    setEditValues(prev => ({
      ...prev,
      [site]: { ...(prev[site] ?? {}), [field]: value },
    }));
  };

  // ── Save edits ──
  const handleSaveEdit = async () => {
    if (!selectedTooth) return;
    setSaving(true);
    const newData = { ...localData, [selectedTooth.toString()]: editValues };
    setLocalData(newData);
    if (onSave) {
      try { await onSave(newData); } catch (e) { console.error(e); }
    }
    setSaving(false);
    setSelectedTooth(null);
  };

  // ── Export: open a new window with just the chart and trigger print ──
  const handleExport = () => {
    const el = chartRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Neural Perio Chart — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060b1a; display: flex; justify-content: center; padding: 24px; }
  body > div { width: 100%; max-width: 860px; }
  @media print { body { padding: 0; } }
</style></head><body><div>${el.outerHTML}</div></body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  // ── Stats ──
  const allPds    = Object.values(localData).flatMap(d => ALL_SITES.map(s => d[s.key]?.pd ?? 0)).filter(Boolean);
  const bopCount  = Object.values(localData).reduce((s,d) => s + ALL_SITES.filter(x => d[x.key]?.bop).length, 0);
  const deepCount = allPds.filter(p => p > 6).length;
  const healthPct = allPds.length ? Math.round((allPds.filter(p => p <= 3).length / allPds.length) * 100) : 0;

  const btnBase: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:5,
    fontSize:8, fontFamily:'monospace', letterSpacing:0.5, cursor:'pointer',
    border:'1px solid rgba(129,140,248,0.3)',
    background:'rgba(99,102,241,0.12)', color:'#a5b4fc',
  };

  return (
    <div
      ref={chartRef}
      style={{
        background:'linear-gradient(170deg,#060b1a 0%,#0a1030 45%,#080d22 100%)',
        borderRadius:14, padding:'20px 24px 18px',
        position:'relative', overflow:'hidden',
        fontFamily:'system-ui,sans-serif',
      }}
    >
      {/* Grid overlay */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(99,102,241,0.07)1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.07)1px,transparent 1px)',
        backgroundSize:'24px 24px',
      }} />
      {/* Centre glow */}
      <div style={{
        position:'absolute', top:'42%', left:'50%', transform:'translate(-50%,-50%)',
        width:'60%', height:80, borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(99,102,241,0.07) 0%,transparent 70%)',
        pointerEvents:'none',
      }} />

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, position:'relative', flexWrap:'wrap' }}>
        <Activity size={13} color="#818cf8" />
        <span style={{ fontSize:10, color:'#a5b4fc', fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase' }}>
          Neural Perio · v3
        </span>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(129,140,248,0.4),transparent)', minWidth:20 }} />

        {/* Stats */}
        {[
          { label:`${healthPct}% Healthy`, col:'#10b981' },
          { label:`${bopCount} BOP`,       col:'#ef4444' },
          { label:`${deepCount} Deep`,     col:'#f59e0b' },
        ].map(s=>(
          <span key={s.label} style={{
            fontSize:8, color:s.col, fontFamily:'monospace',
            border:`1px solid ${s.col}55`, borderRadius:4, padding:'1px 6px', background:`${s.col}14`,
          }}>{s.label}</span>
        ))}

        {/* Action buttons */}
        <button
          onClick={() => setShowHistory(h => !h)}
          style={{ ...btnBase, background: showHistory ? 'rgba(99,102,241,0.25)' : btnBase.background }}
        >
          <History size={10} />
          {fetchingHistory ? 'Loading…' : 'History'}
          {examHistory.length > 0 && (
            <span style={{ fontSize:7, background:'rgba(99,102,241,0.4)', borderRadius:3, padding:'0 4px' }}>
              {examHistory.length}
            </span>
          )}
        </button>
        <button onClick={handleExport} style={btnBase}>
          <Download size={10} /> Export
        </button>
      </div>

      {/* ── History / comparison panel ── */}
      {showHistory && (
        <div style={{
          marginBottom:10, padding:'8px 12px', borderRadius:8,
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
          display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', position:'relative',
        }}>
          <span style={{ fontSize:9, color:'#94a3b8', fontFamily:'monospace' }}>Compare exam:</span>
          {examHistory.length === 0 ? (
            <span style={{ fontSize:8, color:'#475569', fontFamily:'monospace', fontStyle:'italic' }}>
              {leadId ? 'No previous exams found' : 'Select a patient to load history'}
            </span>
          ) : (
            <>
              <select
                value={compareId}
                onChange={e => setCompareId(e.target.value)}
                style={{
                  padding:'3px 8px', fontSize:9, borderRadius:5, fontFamily:'monospace',
                  background:'rgba(15,23,42,0.9)', border:'1px solid rgba(99,102,241,0.35)',
                  color:'#e2e8f0', outline:'none', cursor:'pointer',
                }}
              >
                <option value="">— no comparison —</option>
                {examHistory.map(e => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.date).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}
                  </option>
                ))}
              </select>
              {compareId && (
                <span style={{ fontSize:8, color:'#f59e0b', fontFamily:'monospace' }}>
                  ◻ ghost outlines = selected exam · solid bars = current
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Hint ── */}
      {!selectedTooth && (
        <div style={{ textAlign:'center', marginBottom:6, position:'relative' }}>
          <span style={{ fontSize:7.5, color:'rgba(99,102,241,0.4)', fontFamily:'monospace', letterSpacing:0.5 }}>
            click any tooth to zoom in · M B D L = mesial buccal distal lingual
          </span>
        </div>
      )}

      {/* ── Upper arch ── */}
      <div style={{ overflowX:'auto', padding:'0 8px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          {UPPER.map(n=>(
            <ToothColumn
              key={n} num={n} isUpper
              td={localData[n.toString()] ?? {}}
              compareData={compareData?.[n.toString()]}
              isSelected={selectedTooth === n}
              onClick={() => handleToothClick(n)}
            />
          ))}
        </div>
      </div>

      {/* ── Midline ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'14px 0', position:'relative' }}>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent)' }} />
        <span style={{ fontSize:7, color:'rgba(99,102,241,0.45)', fontFamily:'monospace', whiteSpace:'nowrap' }}>
          ── maxilla / mandible ──
        </span>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(99,102,241,0.2),transparent)' }} />
      </div>

      {/* ── Lower arch ── */}
      <div style={{ overflowX:'auto', padding:'0 8px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', position:'relative' }}>
          {LOWER.map(n=>(
            <ToothColumn
              key={n} num={n} isUpper={false}
              td={localData[n.toString()] ?? {}}
              compareData={compareData?.[n.toString()]}
              isSelected={selectedTooth === n}
              onClick={() => handleToothClick(n)}
            />
          ))}
        </div>
      </div>

      {/* ── Zoomed single-tooth overlay ── */}
      {selectedTooth && (
        <ZoomedToothOverlay
          num={selectedTooth}
          td={localData[selectedTooth.toString()] ?? {}}
          compareData={compareData?.[selectedTooth.toString()]}
          editValues={editValues}
          saving={saving}
          onChange={handleSiteChange}
          onSave={handleSaveEdit}
          onClose={() => setSelectedTooth(null)}
        />
      )}

      {/* ── Legend ── */}
      <div style={{
        display:'flex', gap:14, justifyContent:'center', alignItems:'center', flexWrap:'wrap',
        marginTop:16, paddingTop:12, borderTop:'1px solid rgba(99,102,241,0.2)', position:'relative',
      }}>
        {[
          { col:'#10b981', label:'1–3mm Healthy' },
          { col:'#f59e0b', label:'4–6mm Moderate' },
          { col:'#ef4444', label:'>6mm Problem' },
        ].map(s=>(
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:16, height:5, background:s.col, borderRadius:2, boxShadow:`0 0 6px ${s.col}80` }} />
            <span style={{ fontSize:8, color:'rgba(188,200,230,0.75)', fontFamily:'monospace' }}>{s.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:7, height:9, background:'radial-gradient(ellipse at 50% 40%, #ff4444 40%, #cc0000 100%)', clipPath:'polygon(50% 100%, 0% 0%, 100% 0%)', filter:'drop-shadow(0 0 4px rgba(255,50,50,0.8))' }} />
          <span style={{ fontSize:8, color:'rgba(188,200,230,0.75)', fontFamily:'monospace' }}>BOP</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:10, height:7, border:'1.5px solid #f59e0b', borderRadius:2, opacity:0.5 }} />
          <span style={{ fontSize:8, color:'rgba(188,200,230,0.75)', fontFamily:'monospace' }}>Ghost = prev exam</span>
        </div>
        <span style={{ fontSize:7.5, color:'rgba(99,102,241,0.45)', fontFamily:'monospace', fontStyle:'italic' }}>
          L bar = lingual (palatal)
        </span>
      </div>
    </div>
  );
}
