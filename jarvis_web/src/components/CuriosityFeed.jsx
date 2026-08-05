import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, FlaskConical, HelpCircle, Rocket, X } from 'lucide-react';
import { WS_URL } from '../config';

const HOOK_ICONS = {
  paradox: <HelpCircle size={16} />,
  mindblown: <Sparkles size={16} />,
  challenge: <FlaskConical size={16} />,
  whatif: <Zap size={16} />
};

const HOOK_COLORS = {
  paradox: { border: 'rgba(255, 0, 85, 0.4)', glow: 'rgba(255, 0, 85, 0.15)', text: '#ff6b9d' },
  mindblown: { border: 'rgba(157, 78, 221, 0.4)', glow: 'rgba(157, 78, 221, 0.15)', text: '#c084fc' },
  challenge: { border: 'rgba(0, 243, 255, 0.4)', glow: 'rgba(0, 243, 255, 0.15)', text: '#66e0ff' },
  whatif: { border: 'rgba(255, 215, 0, 0.4)', glow: 'rgba(255, 215, 0, 0.15)', text: '#ffd700' }
};

export default function CuriosityFeed({ onSelectHook, onClose }) {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'curiosity_feed_request' }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'curiosity_feed_response') {
          setHooks(data.hooks || []);
          setLoading(false);
          ws.close();
        }
      } catch {}
    };
    ws.onerror = () => setLoading(false);
    
    // Timeout fallback
    const timeout = setTimeout(() => { setLoading(false); ws.close(); }, 8000);
    return () => { clearTimeout(timeout); ws.close(); };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '40px 0'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Rocket size={24} color="#00f3ff" />
        </motion.div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '2px' }}>
          GENERATING CURIOSITY HOOKS...
        </span>
      </div>
    );
  }

  if (hooks.length === 0) return null;

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
        color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '2px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} color="#ffd700" />
          <span>DAILY CURIOSITY</span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <X size={16} />
          </button>
        )}
      </div>
      <div style={{
        display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px',
        scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch'
      }}>
        <AnimatePresence>
          {hooks.map((hook, index) => {
            const colors = HOOK_COLORS[hook.hook_type] || HOOK_COLORS.mindblown;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectHook(hook.question)}
                style={{
                  minWidth: '280px', maxWidth: '280px', padding: '20px',
                  background: `linear-gradient(135deg, ${colors.glow} 0%, rgba(0,0,0,0.3) 100%)`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '16px', cursor: 'pointer',
                  scrollSnapAlign: 'start',
                  transition: 'all 0.3s ease',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                whileHover={{ scale: 1.03, boxShadow: `0 8px 30px ${colors.glow}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: colors.text, fontSize: '0.65rem', fontFamily: 'Orbitron',
                    letterSpacing: '1px', textTransform: 'uppercase'
                  }}>
                    {HOOK_ICONS[hook.hook_type]}
                    {hook.category}
                  </div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3].map(d => (
                      <div key={d} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: d <= hook.difficulty ? colors.text : 'rgba(255,255,255,0.1)'
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem',
                  lineHeight: '1.5', fontWeight: '500', fontFamily: 'Inter'
                }}>
                  {hook.question}
                </div>
                <div style={{
                  color: colors.text, fontSize: '0.7rem', fontFamily: 'Inter',
                  fontWeight: '500', opacity: 0.7
                }}>
                  Tap to explore →
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
