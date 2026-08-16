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

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

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
      // Mermaid render - clean up any markdown code blocks
      let cleanContent = widget.content || '';
      if (cleanContent.includes('```mermaid')) {
        cleanContent = cleanContent.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```/g, '').trim();
      }
      
      const uniqueId = `mermaid-${widget.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      mermaid.render(uniqueId, cleanContent)
        .then((result) => {
          if (contentRef.current) {
            contentRef.current.innerHTML = result.svg;
          }
        })
        .catch(err => {
          if (contentRef.current) {
            contentRef.current.innerHTML = `<div style="color: #ff3366; text-align: left; overflow: auto; padding: 10px;">
              <strong>Mermaid Error:</strong> ${err.message}
              <pre style="margin-top: 10px; opacity: 0.7;">${cleanContent}</pre>
            </div>`;
          }
        });
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
            padding: '20px', 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
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

          <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {widget.type === 'simulation' ? (
              <iframe 
                src={resolveSimulationUrl(widget.content)} 
                style={{ width: '100%', height: '100%', flex: 1, border: '1px solid rgba(110, 246, 247, 0.25)', borderRadius: '12px', background: '#030508' }}
                title="Fullscreen Simulation"
                allowFullScreen
              />
            ) : widget.type === 'math' ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
