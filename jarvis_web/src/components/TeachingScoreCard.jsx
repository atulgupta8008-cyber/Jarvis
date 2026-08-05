import React from 'react';
import { motion } from 'framer-motion';

const ScoreRing = ({ value, label }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const displayColor = value >= 80 ? '#00ff88' : value >= 50 ? '#ffd700' : '#ff4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="transparent" />
          <motion.circle
            cx="32" cy="32" r={radius}
            stroke={displayColor} strokeWidth="4" fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: '700', color: displayColor
        }}>
          {value}
        </div>
      </div>
      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Orbitron', letterSpacing: '1px', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
};

export default React.memo(function TeachingScoreCard({ score }) {
  if (!score) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        padding: '20px 24px', margin: '8px 0',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px', backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Orbitron', letterSpacing: '2px' }}>
        TEACHING SCORE
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <ScoreRing value={score.clarity || 0} label="Clarity" />
        <ScoreRing value={score.accuracy || 0} label="Accuracy" />
        <ScoreRing value={score.intuition || 0} label="Intuition" />
      </div>
      {score.feedback && (
        <div style={{
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
          textAlign: 'center', maxWidth: '300px', lineHeight: '1.4'
        }}>
          "{score.feedback}"
        </div>
      )}
    </motion.div>
  );
});
