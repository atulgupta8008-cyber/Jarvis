import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Plot from 'react-plotly.js';
import { Cpu, Activity, Zap, Database, Radio, Globe, Shield, Sparkles, Orbit, Maximize2, Minimize2 } from 'lucide-react';
import { API_URL } from '../config';

const resolveSimulationUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://localhost:8000') && API_URL && !API_URL.includes('localhost:8000')) {
    return url.replace('http://localhost:8000', API_URL);
  }
  return url;
};

const DataPanel = ({ data, status = 'sleeping' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Handle fully self-contained HTML rendering (Physics Simulations)
  if (data && data.type === 'html_view' && data.html_url) {
    const safeSimulationUrl = resolveSimulationUrl(data.html_url);
    return (
      <>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ color: 'var(--cyan, #6ef6f7)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Orbit size={16} /> Physics Engine Simulation
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                LIVE
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                title="Fullscreen Simulation"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f4f7ff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontFamily: 'DM Mono, monospace',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Maximize2 size={12} /> Fullscreen
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '380px', width: '100%', height: '100%', position: 'relative' }}>
            <iframe 
              src={safeSimulationUrl} 
              style={{ width: '100%', height: '100%', minHeight: '380px', border: '1px solid rgba(110, 246, 247, 0.25)', borderRadius: '12px', background: '#030508' }}
              title="Physics Simulation"
            />
          </div>
        </div>

        {/* Fullscreen Overlay Lightbox rendered directly to document.body via Portal */}
        {isFullscreen && createPortal(
          <div style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            height: '100dvh',
            zIndex: 999999,
            background: '#030508',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Orbit size={20} color="var(--cyan, #6ef6f7)" />
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#fff', fontSize: '1.2rem', margin: 0 }}>
                  Interactive Physics Engine Simulation
                </h2>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#8e9bb9', marginLeft: '10px' }}>
                  Press ESC or click button to exit
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <Minimize2 size={14} /> Exit Fullscreen
              </button>
            </div>
            <iframe 
              src={safeSimulationUrl} 
              style={{ width: '100%', height: '100%', flex: 1, border: '1px solid rgba(110, 246, 247, 0.3)', borderRadius: '12px', background: '#030508' }}
              title="Fullscreen Physics Simulation"
              allowFullScreen
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Handle Plotly dashboard charts
  if (data && (data.x_data || data.y_data)) {
    const { title, chart_type, x_data, y_data, x_label, y_label } = data;
    const plotData = [
      {
        x: x_data,
        y: y_data,
        type: chart_type === 'bar' ? 'bar' : 'scatter',
        mode: chart_type === 'line' ? 'lines+markers' : 'markers',
        marker: { color: '#6ef6f7' },
        line: { color: '#6ef6f7', width: 2 }
      }
    ];

    const plotLayout = {
      title: {
        text: title || 'Telemetry Analysis',
        font: { color: '#f4f7ff', family: 'Space Grotesk', size: 14 }
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: {
        title: x_label || 'X',
        color: '#8e9bb9',
        gridcolor: 'rgba(255, 255, 255, 0.08)'
      },
      yaxis: {
        title: y_label || 'Y',
        color: '#8e9bb9',
        gridcolor: 'rgba(255, 255, 255, 0.08)'
      },
      font: { color: '#f4f7ff' },
      margin: { t: 36, l: 36, r: 16, b: 36 },
      autosize: true
    };

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
        <Plot
          data={plotData}
          layout={plotLayout}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%', minHeight: '380px' }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>
    );
  }

  // Default AI Intelligence Telemetry & System Diagnostics View
  return (
    <div className="telemetry-dashboard-container">
      {/* Subsystem Health Grid */}
      <div className="telemetry-grid">
        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <Cpu size={14} color="var(--cyan, #6ef6f7)" />
            <span>NEURAL CORE</span>
          </div>
          <div className="telemetry-metric">ONLINE</div>
          <div className="telemetry-subtext">Gemini 2.5 Flash / Pro Handoff</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <Radio size={14} color="var(--violet, #a78bfa)" />
            <span>VOICE PIPELINE</span>
          </div>
          <div className="telemetry-metric">READY</div>
          <div className="telemetry-subtext">Wake Word "Jarvis" Active</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <Database size={14} color="#34d399" />
            <span>STORAGE VAULT</span>
          </div>
          <div className="telemetry-metric">CONNECTED</div>
          <div className="telemetry-subtext">Supabase Cloud + Local Cache</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <Zap size={14} color="#fbbf24" />
            <span>LATENCY</span>
          </div>
          <div className="telemetry-metric">~18ms</div>
          <div className="telemetry-subtext">Real-time WebSocket link</div>
        </div>
      </div>

      {/* Active Cognitive Protocols */}
      <div className="telemetry-section-title">
        <Sparkles size={13} /> COGNITIVE SUBSYSTEMS
      </div>

      <div className="telemetry-protocol-list">
        <div className="telemetry-protocol-item">
          <div className="protocol-badge cyan">PRO</div>
          <div className="protocol-info">
            <div className="protocol-name">Professor Engine</div>
            <div className="protocol-desc">Socratic dialogue & fractal equation derivations</div>
          </div>
          <span className="protocol-status">ACTIVE</span>
        </div>

        <div className="telemetry-protocol-item">
          <div className="protocol-badge violet">ARC</div>
          <div className="protocol-info">
            <div className="protocol-name">Architect Protocol</div>
            <div className="protocol-desc">Concept mapping & teaching evaluation</div>
          </div>
          <span className="protocol-status">ACTIVE</span>
        </div>

        <div className="telemetry-protocol-item">
          <div className="protocol-badge emerald">STU</div>
          <div className="protocol-info">
            <div className="protocol-name">Study Group Swarm</div>
            <div className="protocol-desc">Opposing debate agents & critical scrutiny</div>
          </div>
          <span className="protocol-status">ACTIVE</span>
        </div>
      </div>

      {/* Signal Status Bar */}
      <div className="telemetry-footer-bar">
        <div className="telemetry-status-ping">
          <span className="ping-dot" />
          <span>Continuous Intelligence Loop Operational</span>
        </div>
      </div>
    </div>
  );
};

export default DataPanel;
