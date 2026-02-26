/**
 * Perio AI Side Panel
 * Displays AI-generated periodontal assessment alongside the Neural Perio chart
 */

'use client';

import { useState, useCallback } from 'react';
import { Brain, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Shield, RefreshCw, X, Activity } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToothFinding {
  tooth: number;
  severity: 'mild' | 'moderate' | 'severe';
  finding: string;
  suggestion: string;
}

interface AiAnalysis {
  severity: 'healthy' | 'mild' | 'moderate' | 'severe';
  classification: string;
  summary: string;
  keyFindings: string[];
  toothFindings: ToothFinding[];
  suggestedActions: string[];
  riskFactors: string[];
  disclaimer: string;
}

interface PerioMetrics {
  totalSites: number;
  healthySites: number;
  moderateSites: number;
  severeSites: number;
  bopSites: number;
  healthPct: number;
  bopPct: number;
  worstPd: number;
  pattern: string;
}

interface PerioAiSidePanelProps {
  leadId?: string;
  measurements?: Record<string, any>;
  onToothClick?: (tooth: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, { bg: string; border: string; text: string; glow: string; dot: string }> = {
  healthy:  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.35)', text: '#10b981', glow: 'rgba(16,185,129,0.3)', dot: '#10b981' },
  mild:     { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.30)', text: '#f59e0b', glow: 'rgba(245,158,11,0.25)', dot: '#f59e0b' },
  moderate: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.40)', text: '#f59e0b', glow: 'rgba(245,158,11,0.3)', dot: '#f59e0b' },
  severe:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.40)',  text: '#ef4444', glow: 'rgba(239,68,68,0.3)', dot: '#ef4444' },
};

function sevColor(sev: string) { return SEV_COLORS[sev] || SEV_COLORS.healthy; }

// ─── Component ────────────────────────────────────────────────────────────────

export function PerioAiSidePanel({ leadId, measurements, onToothClick }: PerioAiSidePanelProps) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [metrics, setMetrics] = useState<PerioMetrics | null>(null);
  const [xrayAvailable, setXrayAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    findings: true,
    teeth: true,
    actions: true,
    risk: false,
  });

  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const runAnalysis = useCallback(async () => {
    if (!leadId || !measurements) {
      setError('Select a patient and ensure periodontal data is available.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dental/periodontal/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, measurements }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
      setMetrics(data.metrics);
      setXrayAvailable(data.xrayDataAvailable);
    } catch (e: any) {
      setError(e.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  }, [leadId, measurements]);

  const s: React.CSSProperties = {
    fontFamily: 'system-ui, sans-serif',
    background: 'linear-gradient(175deg, #070c1e 0%, #0b1132 50%, #080d24 100%)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 14,
    padding: '14px 16px',
    minWidth: 280,
    maxWidth: 340,
    overflow: 'auto',
    position: 'relative',
  };

  // ── Not yet analyzed — show CTA ──
  if (!analysis) {
    return (
      <div style={s}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Brain size={14} color="#818cf8" />
          <span style={{ fontSize:11, color:'#a5b4fc', fontFamily:'monospace', letterSpacing:1.5, textTransform:'uppercase', fontWeight:700 }}>
            AI Analysis
          </span>
        </div>

        <div style={{
          padding:'20px 16px', textAlign:'center', borderRadius:10,
          background:'rgba(99,102,241,0.06)', border:'1px dashed rgba(99,102,241,0.25)',
        }}>
          <Sparkles size={24} color="#818cf8" style={{ margin:'0 auto 10px' }} />
          <p style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace', lineHeight:1.6, marginBottom:14 }}>
            Run AI analysis to get a severity assessment, per-tooth findings, and treatment suggestions — combining periodontal probing data{leadId ? ' and any existing x-ray analyses' : ''}.
          </p>

          {error && (
            <p style={{ fontSize:9, color:'#ef4444', fontFamily:'monospace', marginBottom:10 }}>{error}</p>
          )}

          <button
            onClick={runAnalysis}
            disabled={loading || !leadId}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:8, fontSize:11,
              background: loading ? '#374151' : '#4f46e5',
              color:'#e0e7ff', border:'none', cursor: loading || !leadId ? 'default' : 'pointer',
              fontFamily:'monospace', fontWeight:700, letterSpacing:0.5,
              opacity: !leadId ? 0.5 : 1,
            }}
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Brain size={12} />}
            {loading ? 'Analyzing…' : 'Run AI Analysis'}
          </button>
          {!leadId && (
            <p style={{ fontSize:8, color:'#475569', fontFamily:'monospace', marginTop:8, fontStyle:'italic' }}>
              Select a patient first
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Analysis results ──
  const sc = sevColor(analysis.severity);

  return (
    <div style={s}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Brain size={14} color="#818cf8" />
          <span style={{ fontSize:11, color:'#a5b4fc', fontFamily:'monospace', letterSpacing:1.5, textTransform:'uppercase', fontWeight:700 }}>
            AI Analysis
          </span>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          title="Re-run analysis"
          style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'3px 8px', borderRadius:5, fontSize:8,
            background:'rgba(99,102,241,0.12)', color:'#a5b4fc',
            border:'1px solid rgba(99,102,241,0.3)', cursor:'pointer',
            fontFamily:'monospace',
          }}
        >
          <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Severity badge */}
      <div style={{
        padding:'10px 14px', borderRadius:10, marginBottom:12,
        background: sc.bg, border:`1px solid ${sc.border}`,
        boxShadow:`0 0 20px ${sc.glow}`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:sc.dot, boxShadow:`0 0 8px ${sc.dot}` }} />
          <span style={{ fontSize:14, color:sc.text, fontFamily:'monospace', fontWeight:800, textTransform:'uppercase', letterSpacing:1 }}>
            {analysis.severity}
          </span>
        </div>
        <span style={{ fontSize:10, color:'#cbd5e1', fontFamily:'monospace' }}>
          {analysis.classification}
        </span>
      </div>

      {/* Summary */}
      <p style={{ fontSize:10, color:'#94a3b8', lineHeight:1.65, marginBottom:12, fontFamily:'monospace' }}>
        {analysis.summary}
      </p>

      {/* X-ray badge */}
      {xrayAvailable && (
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'4px 10px', borderRadius:6, marginBottom:12,
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
        }}>
          <Activity size={9} color="#818cf8" />
          <span style={{ fontSize:8, color:'#818cf8', fontFamily:'monospace' }}>
            X-ray findings integrated into this analysis
          </span>
        </div>
      )}

      {/* Metrics bar */}
      {metrics && (
        <div style={{
          display:'flex', gap:6, marginBottom:12, flexWrap:'wrap',
        }}>
          {[
            { label: `${metrics.healthPct}% Healthy`, col: '#10b981' },
            { label: `${metrics.bopPct}% BOP`, col: '#ef4444' },
            { label: `${metrics.worstPd}mm worst`, col: metrics.worstPd > 6 ? '#ef4444' : metrics.worstPd > 3 ? '#f59e0b' : '#10b981' },
          ].map(m => (
            <span key={m.label} style={{
              fontSize:8, color:m.col, fontFamily:'monospace',
              border:`1px solid ${m.col}44`, borderRadius:4, padding:'2px 6px',
              background:`${m.col}12`,
            }}>{m.label}</span>
          ))}
        </div>
      )}

      {/* ── Collapsible sections ── */}

      {/* Key Findings */}
      {analysis.keyFindings.length > 0 && (
        <Section title="Key Findings" count={analysis.keyFindings.length} expanded={expandedSections.findings} onToggle={() => toggle('findings')}>
          {analysis.keyFindings.map((f, i) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
              <span style={{ color:'#818cf8', fontSize:8, marginTop:1 }}>●</span>
              <span style={{ fontSize:9, color:'#cbd5e1', fontFamily:'monospace', lineHeight:1.5 }}>{f}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Per-tooth findings */}
      {analysis.toothFindings.length > 0 && (
        <Section title="Tooth-by-Tooth" count={analysis.toothFindings.length} expanded={expandedSections.teeth} onToggle={() => toggle('teeth')}>
          {analysis.toothFindings.map((tf, i) => {
            const tc = sevColor(tf.severity);
            return (
              <div
                key={i}
                onClick={() => onToothClick?.(tf.tooth)}
                style={{
                  padding:'6px 8px', borderRadius:6, marginBottom:6, cursor: onToothClick ? 'pointer' : 'default',
                  background: tc.bg, border:`1px solid ${tc.border}`,
                  transition:'transform 0.1s',
                }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                  <span style={{ fontSize:9, color:tc.text, fontFamily:'monospace', fontWeight:700 }}>
                    Tooth #{tf.tooth}
                  </span>
                  <span style={{
                    fontSize:7, color:tc.text, fontFamily:'monospace', textTransform:'uppercase',
                    padding:'1px 5px', borderRadius:3, background:`${tc.dot}20`,
                  }}>
                    {tf.severity}
                  </span>
                </div>
                <p style={{ fontSize:8.5, color:'#94a3b8', fontFamily:'monospace', lineHeight:1.5, marginBottom:3 }}>
                  {tf.finding}
                </p>
                <p style={{ fontSize:8, color:'#818cf8', fontFamily:'monospace', fontStyle:'italic', lineHeight:1.4 }}>
                  → {tf.suggestion}
                </p>
              </div>
            );
          })}
        </Section>
      )}

      {/* Suggested Actions */}
      {analysis.suggestedActions.length > 0 && (
        <Section title="Suggested Actions" count={analysis.suggestedActions.length} expanded={expandedSections.actions} onToggle={() => toggle('actions')}>
          {analysis.suggestedActions.map((a, i) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
              <span style={{ color:'#10b981', fontSize:8, marginTop:1 }}>▸</span>
              <span style={{ fontSize:9, color:'#cbd5e1', fontFamily:'monospace', lineHeight:1.5 }}>{a}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Risk Factors */}
      {analysis.riskFactors.length > 0 && (
        <Section title="Risk Factors" count={analysis.riskFactors.length} expanded={expandedSections.risk} onToggle={() => toggle('risk')}>
          {analysis.riskFactors.map((r, i) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
              <AlertTriangle size={9} color="#f59e0b" style={{ marginTop:1, flexShrink:0 }} />
              <span style={{ fontSize:9, color:'#cbd5e1', fontFamily:'monospace', lineHeight:1.5 }}>{r}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop:12, padding:'8px 10px', borderRadius:8,
        background:'rgba(100,116,139,0.08)', border:'1px solid rgba(100,116,139,0.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
          <Shield size={9} color="#64748b" />
          <span style={{ fontSize:7.5, color:'#64748b', fontFamily:'monospace', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>
            Disclaimer
          </span>
        </div>
        <p style={{ fontSize:7.5, color:'#475569', fontFamily:'monospace', lineHeight:1.5 }}>
          {analysis.disclaimer || 'AI-assisted clinical decision support. Not a diagnosis. All findings require verification by a licensed dental professional. Not a substitute for professional judgment.'}
        </p>
      </div>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title, count, expanded, onToggle, children,
}: { title: string; count: number; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:10 }}>
      <button
        onClick={onToggle}
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
          padding:'5px 0', background:'none', border:'none', cursor:'pointer',
          borderBottom:'1px solid rgba(99,102,241,0.12)',
        }}
      >
        <span style={{ fontSize:9, color:'#a5b4fc', fontFamily:'monospace', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>
          {title}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:7, color:'#64748b', fontFamily:'monospace', background:'rgba(99,102,241,0.15)', padding:'1px 5px', borderRadius:3 }}>
            {count}
          </span>
          {expanded ? <ChevronUp size={10} color="#64748b" /> : <ChevronDown size={10} color="#64748b" />}
        </div>
      </button>
      {expanded && (
        <div style={{ paddingTop:8 }}>
          {children}
        </div>
      )}
    </div>
  );
}
