import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function NexusHubModal({ isActive, onLaunchMode }) {
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'JARVIS_LAUNCH_MODE') {
        const mode = event.data.mode;
        onLaunchMode(mode);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLaunchMode]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.98 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      {/* Embedded Nexus Iframe */}
      <iframe
        src="/nexus/index.html"
        title="JARVIS NEXUS HUB"
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          outline: 'none'
        }}
      />
    </motion.div>
  );
}
