import React, { memo } from 'react';

function BackgroundFX({ status }) {
  // Soft, performant ambient colors
  let glowColor = 'rgba(115, 147, 255, 0.16)';
  if (status === 'listening') glowColor = 'rgba(102, 224, 255, 0.20)';
  if (status === 'thinking') glowColor = 'rgba(166, 124, 255, 0.20)';
  if (status === 'executing') glowColor = 'rgba(255, 255, 255, 0.15)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      contain: 'strict'
    }}>
      {/* Primary Ambient Glow Spot */}
      <div 
        style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: '70vw',
          height: '70vh',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle at center, ${glowColor} 0%, rgba(3, 5, 8, 0) 70%)`,
          transition: 'background 0.8s ease',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
      
      {/* Secondary Ambient Glow Spot */}
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '60vw',
          height: '60vh',
          background: 'radial-gradient(circle at center, rgba(166, 124, 255, 0.07) 0%, rgba(3, 5, 8, 0) 70%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

export default memo(BackgroundFX);

