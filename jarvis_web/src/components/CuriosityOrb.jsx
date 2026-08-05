import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function CuriosityOrb({ hooks, onLaunchCuriosity, onOpenDashboard }) {
  const [activeHook, setActiveHook] = useState(null);

  useEffect(() => {
    if (!hooks || hooks.length === 0) return;

    const intervalId = setInterval(() => {
      const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
      setActiveHook(randomHook);
      
      // Hide the tooltip after 5 seconds
      setTimeout(() => {
        setActiveHook(null);
      }, 5000);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [hooks]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '40px',
      right: '40px',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      <AnimatePresence>
        {activeHook && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => {
              onLaunchCuriosity(activeHook.question);
              setActiveHook(null);
            }}
            style={{
              background: 'rgba(3, 7, 18, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(157, 78, 221, 0.5)',
              borderRadius: '20px',
              padding: '12px 20px',
              color: '#fff',
              maxWidth: '300px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(157, 78, 221, 0.3)',
              fontFamily: 'Orbitron, sans-serif'
            }}
          >
            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
              {activeHook.question}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9d4edd', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {activeHook.category}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onOpenDashboard}
        animate={{
          boxShadow: [
            "0 0 0 rgba(157, 78, 221, 0)",
            "0 0 20px rgba(157, 78, 221, 0.6)",
            "0 0 0 rgba(157, 78, 221, 0)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4c1d95, #7e22ce)',
          border: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <Sparkles size={28} />
      </motion.button>
    </div>
  );
}
