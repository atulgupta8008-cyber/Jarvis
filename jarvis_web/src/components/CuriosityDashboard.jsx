import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function CuriosityDashboard({ hooks, onClose, onLaunchCuriosity }) {
  
  const getGlowColor = (type) => {
    switch (type) {
      case 'paradox': return 'rgba(239, 68, 68, 0.6)'; // red
      case 'mindblown': return 'rgba(168, 85, 247, 0.6)'; // purple
      case 'challenge': return 'rgba(234, 179, 8, 0.6)'; // yellow
      case 'whatif': return 'rgba(56, 189, 248, 0.6)'; // cyan
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(3, 7, 18, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px',
        overflowY: 'auto'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{ 
          color: 'white', 
          fontFamily: 'Orbitron, sans-serif', 
          fontSize: '2.5rem', 
          margin: 0,
          textShadow: '0 0 20px rgba(157, 78, 221, 0.5)'
        }}>
          CURIOSITY ENGINE
        </h1>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '10px'
          }}
        >
          <X size={32} />
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px',
        paddingBottom: '40px'
      }}>
        {hooks.map((hook, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onLaunchCuriosity(hook.question)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: `0 0 20px ${getGlowColor(hook.hook_type)}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: getGlowColor(hook.hook_type),
              opacity: 0.8
            }} />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'white',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 10px',
                borderRadius: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {hook.category}
              </span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3].map((level) => (
                  <div key={level} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: level <= hook.difficulty ? 'white' : 'rgba(255, 255, 255, 0.2)'
                  }} />
                ))}
              </div>
            </div>

            <p style={{
              color: 'white',
              fontSize: '1.2rem',
              lineHeight: '1.5',
              fontFamily: 'Inter, sans-serif',
              margin: '0 0 20px 0',
              flex: 1
            }}>
              {hook.question}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
