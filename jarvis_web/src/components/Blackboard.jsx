import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import mermaid from 'mermaid';
import { Minus, X, Activity, Type, GitMerge, Maximize2, Minimize2 } from 'lucide-react';
import FractalEquation from './FractalEquation';
import { API_URL } from '../config';

const resolveSimulationUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://localhost:8000') && API_URL && !API_URL.includes('localhost:8000')) {
    return url.replace('http://localhost:8000', API_URL);
  }
  return url;
};

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#0a2a2b',
    primaryTextColor: '#6ef6f7',
    primaryBorderColor: '#6ef6f7',
    secondaryColor: '#1a1530',
    secondaryTextColor: '#a996ff',
    secondaryBorderColor: '#a996ff',
    tertiaryColor: '#0a2b1a',
    tertiaryTextColor: '#34d399',
    tertiaryBorderColor: '#34d399',
    lineColor: '#6ef6f7',
    textColor: '#e0e6f0',
    mainBkg: '#0a2a2b',
    nodeBorder: '#6ef6f7',
    clusterBkg: 'rgba(110, 246, 247, 0.05)',
    clusterBorder: '#6ef6f7',
    titleColor: '#f4f7ff',
    edgeLabelBackground: '#0d1117',
    nodeTextColor: '#e0e6f0',
    actorBorder: '#6ef6f7',
    actorBkg: '#0a2a2b',
    actorTextColor: '#e0e6f0',
    actorLineColor: '#6ef6f7',
    signalColor: '#e0e6f0',
    signalTextColor: '#e0e6f0',
    labelBoxBkgColor: '#0d1117',
    labelBoxBorderColor: '#6ef6f7',
    labelTextColor: '#e0e6f0',
    loopTextColor: '#a996ff',
    noteBorderColor: '#a996ff',
    noteBkgColor: '#1a1530',
    noteTextColor: '#e0e6f0',
    activationBorderColor: '#6ef6f7',
    activationBkgColor: '#0a2a2b',
    sequenceNumberColor: '#030508',
    sectionBkgColor: '#0a2a2b',
    altSectionBkgColor: '#0d1117',
    sectionBkgColor2: '#1a1530',
    taskBorderColor: '#6ef6f7',
    taskBkgColor: '#0a2a2b',
    taskTextColor: '#e0e6f0',
    activeTaskBorderColor: '#a996ff',
    activeTaskBkgColor: '#1a1530',
    gridColor: 'rgba(255,255,255,0.08)',
    doneTaskBkgColor: '#0a2b1a',
    doneTaskBorderColor: '#34d399',
    critBorderColor: '#ff9db8',
    critBkgColor: '#2b0a1a',
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: '14px',
  },
  flowchart: {
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 60,
    htmlLabels: true,
    useMaxWidth: true,
  },
  sequence: {
    diagramMarginX: 20,
    diagramMarginY: 20,
    actorMargin: 80,
    width: 180,
    height: 50,
    boxMargin: 10,
    boxTextMargin: 8,
    noteMargin: 10,
    messageMargin: 40,
    mirrorActors: true,
    useMaxWidth: true,
  },
});

const WidgetCard = ({ widget, onMinimize, onRemove, onFractalExpand }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef(null);
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Subtle 2.5D rotation mapped to mouse distance from center
  const rotateX = useTransform(y, [-200, 200], [4, -4]);
  const rotateY = useTransform(x, [-300, 300], [-4, 4]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (!contentRef.current) return;

    if (widget.type === 'diagram') {
      let cleanContent = widget.content || '';
      
      // Strip markdown code fences
      cleanContent = cleanContent.replace(/```(?:mermaid)?\s*/gi, '').replace(/```/g, '').trim();
      
      // Find where actual Mermaid diagram starts (strip any preceding text)
      const diagramTypes = ['graph ', 'graph\n', 'flowchart ', 'flowchart\n', 'sequenceDiagram', 'stateDiagram', 'classDiagram', 'erDiagram', 'pie', 'mindmap'];
      let diagramStart = -1;
      for (const dt of diagramTypes) {
        const pos = cleanContent.indexOf(dt);
        if (pos !== -1 && (diagramStart === -1 || pos < diagramStart)) {
          diagramStart = pos;
        }
      }
      if (diagramStart > 0) {
        cleanContent = cleanContent.substring(diagramStart);
      }
      
      // Remove any stray HTML/XML tags
      cleanContent = cleanContent.replace(/<[^>]+>/g, '').trim();
      
      // Fix common Mermaid syntax issues
      // Escape problematic characters in node labels
      cleanContent = cleanContent.replace(/\(([^)]*\([^)]*\)[^)]*)\)/g, (m, inner) => `("${inner}")`);
      
      if (!cleanContent) {
        if (contentRef.current) {
          contentRef.current.innerHTML = '<div style="color: #8994ad; padding: 20px; text-align: center; font-family: DM Mono, monospace; font-size: 13px;">No diagram content available</div>';
        }
        return;
      }
      
      const uniqueId = `mermaid-${widget.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      const tryRender = async (content, attempt = 1) => {
        try {
          const result = await mermaid.render(uniqueId + (attempt > 1 ? `-r${attempt}` : ''), content);
          if (contentRef.current) {
            contentRef.current.innerHTML = result.svg;
            // Apply custom styling to SVG
            const svg = contentRef.current.querySelector('svg');
            if (svg) {
              svg.style.maxWidth = '100%';
              svg.style.height = 'auto';
            }
          }
        } catch (err) {
          if (attempt === 1) {
            // Retry with simplified content: remove style directives that might cause issues
            let simplified = content.replace(/style\s+\w+[^\n]*/g, '').replace(/linkStyle[^\n]*/g, '').replace(/classDef[^\n]*/g, '').trim();
            if (simplified !== content) {
              return tryRender(simplified, 2);
            }
          }
          // Final fallback: show styled code block
          if (contentRef.current) {
            contentRef.current.innerHTML = `
              <div style="padding: 16px; font-family: 'DM Mono', monospace; font-size: 12px; line-height: 1.6; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(110,246,247,0.15); overflow: auto;">
                <div style="color: #ff9db8; margin-bottom: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">⚠ Diagram Rendering Issue</div>
                <pre style="color: #8994ad; white-space: pre-wrap; margin: 0;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>`;
          }
        }
      };
      
      tryRender(cleanContent);
    }
  }, [widget]);

  let icon = <Activity size={16} />;
  let title = 'Simulation';
  if (widget.type === 'math') { icon = <Type size={16} />; title = 'Derivation (Fractal Math)'; }
  if (widget.type === 'diagram') { icon = <GitMerge size={16} />; title = 'Architecture'; }

  // Construct initial tree node for math widget if tree is not yet built
  const initialTree = widget.tree || {
    id: widget.id,
    equation: widget.content,
    children: []
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        drag
        dragMomentum={false}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1200,
          transformStyle: "preserve-3d",
          position: 'absolute',
          top: '5%',
          left: 'calc(50% - min(320px, calc(50% - 12px)))',
          width: 'min(640px, calc(100% - 24px))',
          minHeight: '280px',
          maxHeight: '85vh',
          background: 'rgba(20, 25, 35, 0.75)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,243,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        {/* Title Bar - acts as drag handle */}
        <div 
          className="drag-handle"
          style={{
            padding: '14px 20px',
            background: widget.author === 'vance' ? 'linear-gradient(90deg, rgba(255,69,0,0.2) 0%, transparent 100%)' : widget.author === 'ada' ? 'linear-gradient(90deg, rgba(50,205,50,0.2) 0%, transparent 100%)' : 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'grab'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.9rem', fontFamily: 'Orbitron' }}>
            {icon} {title}
            {widget.author && (
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                background: widget.author === 'vance' ? 'rgba(255, 69, 0, 0.2)' : 'rgba(50, 205, 50, 0.2)',
                color: widget.author === 'vance' ? '#FF4500' : '#32CD32',
                border: widget.author === 'vance' ? '1px solid #FF4500' : '1px solid #32CD32'
              }}>
                {widget.author === 'vance' ? 'Dr. Vance' : 'Ada'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button type="button" onClick={() => setIsFullscreen(true)} style={btnStyle} title="Fullscreen"><Maximize2 size={14} /></button>
            <button type="button" onClick={() => onMinimize(widget.id)} style={btnStyle} title="Minimize"><Minus size={14} /></button>
            <button type="button" onClick={() => onRemove(widget.id)} style={{...btnStyle, color: '#ff3366'}} title="Close"><X size={14} /></button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          style={{ 
            flex: 1, 
            padding: '14px 12px', 
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            minHeight: 0,
            color: '#fff'
          }}
        >
          {widget.type === 'simulation' ? (
            <iframe 
              src={resolveSimulationUrl(widget.content)} 
              style={{ width: '100%', height: '100%', minHeight: '400px', border: 'none', background: 'transparent' }}
              title="Simulation"
              allowFullScreen
            />
          ) : widget.type === 'math' ? (
            <div style={{ width: '100%', maxWidth: '100%' }}>
              <FractalEquation 
                node={initialTree}
                context={widget.content}
                onVariableClick={(targetVar, nodeId) => {
                  if (onFractalExpand) {
                    onFractalExpand(widget.id, nodeId, targetVar, widget.content);
                  }
                }}
              />
            </div>
          ) : (
            <div ref={contentRef} style={{ width: '100%', height: '100%', textAlign: 'center' }}></div>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Lightbox Overlay via Portal to document.body */}
      {isFullscreen && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          height: '100dvh',
          zIndex: 999999,
          background: 'rgba(3, 5, 8, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '12px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif' }}>
              {icon} {title}
              {widget.author && (
                <span style={{
                  marginLeft: '10px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  background: widget.author === 'vance' ? 'rgba(255, 69, 0, 0.2)' : 'rgba(50, 205, 50, 0.2)',
                  color: widget.author === 'vance' ? '#FF4500' : '#32CD32',
                  border: widget.author === 'vance' ? '1px solid #FF4500' : '1px solid #32CD32'
                }}>
                  {widget.author === 'vance' ? 'Dr. Vance' : 'Ada'}
                </span>
              )}
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#8e9bb9', marginLeft: '12px' }}>
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

          <div style={{ flex: 1, width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {widget.type === 'simulation' ? (
              <iframe 
                src={resolveSimulationUrl(widget.content)} 
                style={{ width: '100%', height: '100%', flex: 1, border: '1px solid rgba(110, 246, 247, 0.25)', borderRadius: '12px', background: '#030508' }}
                title="Fullscreen Simulation"
                allowFullScreen
              />
            ) : widget.type === 'math' ? (
              <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '16px 8px' }}>
                <FractalEquation 
                  node={initialTree}
                  context={widget.content}
                  onVariableClick={(targetVar, nodeId) => {
                    if (onFractalExpand) {
                      onFractalExpand(widget.id, nodeId, targetVar, widget.content);
                    }
                  }}
                />
              </div>
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: contentRef.current?.innerHTML || '' }} 
                style={{ width: '100%', height: '100%', overflow: 'auto', padding: '20px', textAlign: 'center' }} 
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const btnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const Blackboard = React.memo(function Blackboard({ widgets = [], setWidgets, onFractalExpand }) {
  
  const handleMinimize = (id) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
  };

  const handleMaximize = (id) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, minimized: false } : w));
  };

  const handleRemove = (id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const activeWidgets = widgets.filter(w => !w.minimized);
  const minimizedWidgets = widgets.filter(w => w.minimized);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      
      {widgets.length === 0 && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)' }}>
          <motion.div
             animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.98, 1, 0.98] }}
             transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
             style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
             <GitMerge size={56} style={{ opacity: 0.5 }} />
             <h2 style={{ fontFamily: 'Orbitron', letterSpacing: '4px', margin: 0, fontWeight: 500, textTransform: 'uppercase' }}>The Blackboard is Empty</h2>
          </motion.div>
        </div>
      )}

      {/* Render Active Widgets */}
      <AnimatePresence>
        {activeWidgets.map(widget => (
          <WidgetCard 
            key={widget.id} 
            widget={widget} 
            onMinimize={handleMinimize}
            onRemove={handleRemove}
            onFractalExpand={onFractalExpand}
          />
        ))}
      </AnimatePresence>

      {/* The Dock */}
      {minimizedWidgets.length > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,25,35,0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '12px 24px',
            display: 'flex',
            gap: '15px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100
          }}
        >
          {minimizedWidgets.map(w => {
            let icon = <Activity size={24} />;
            let color = '#00f3ff';
            if (w.type === 'math') { icon = <Type size={24} />; color = '#9d00ff'; }
            if (w.type === 'diagram') { icon = <GitMerge size={24} />; color = '#00ff66'; }
            
            return (
              <motion.div
                key={w.id}
                whileHover={{ scale: 1.2, y: -5 }}
                onClick={() => handleMaximize(w.id)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color,
                  cursor: 'pointer',
                  boxShadow: `0 0 10px ${color}40`
                }}
                title={`Maximize ${w.type}`}
              >
                {icon}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
});

export default Blackboard;
