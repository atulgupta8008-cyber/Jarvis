import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundFX({ status }) {
  // Determine dominant glow color based on JARVIS status
  let glowColor = 'rgba(115, 147, 255, 0.4)'; // Default: ethereal-blue (sleeping/speaking)
  
  if (status === 'listening') glowColor = 'rgba(102, 224, 255, 0.4)'; // ethereal-cyan
  if (status === 'thinking') glowColor = 'rgba(166, 124, 255, 0.4)'; // ethereal-purple
  if (status === 'executing') glowColor = 'rgba(255, 255, 255, 0.3)'; // ethereal-white

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none'
    }}>
      {/* Main Ambient Glow Orb */}
      <motion.div
        animate={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
          scale: status === 'speaking' ? [1, 1.1, 1] : 1,
          opacity: status === 'sleeping' ? 0.3 : 0.8
        }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: status === 'speaking' ? Infinity : 0
        }}
        style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: '80vw',
          height: '80vh',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(80px)',
          zIndex: 1
        }}
      />
      
      {/* Secondary Slow Moving Orb */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 80, 0],
        }}
        transition={{
          duration: 20,
          ease: "linear",
          repeat: Infinity
        }}
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '70vw',
          height: '70vh',
          background: 'radial-gradient(circle, rgba(166, 124, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(100px)',
          zIndex: 1
        }}
      />
    </div>
  );
}
