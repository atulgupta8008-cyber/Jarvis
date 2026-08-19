import React, { useEffect, useRef, memo } from 'react';
import { Bot } from 'lucide-react';
import FormattedMessage from './FormattedMessage';
import TeachingScoreCard from './TeachingScoreCard';

const MessageBubble = memo(({ msg, theme, isLast }) => {
  let displayName = 'Jarvis';
  let isUser = false;
  let accentBorder = 'rgba(255, 255, 255, 0.08)';
  let roleColor = '#94a3b8';
  let bg = 'rgba(15, 23, 42, 0.75)';

  if (theme === 'professor') {
    if (msg.role === 'user') {
      isUser = true;
      displayName = 'You';
    } else if (msg.role === 'vance') {
      displayName = 'Dr. Vance';
      roleColor = '#FF4500';
      accentBorder = '#FF4500';
      bg = 'linear-gradient(90deg, rgba(255, 69, 0, 0.14) 0%, rgba(20, 25, 40, 0.8) 100%)';
    } else if (msg.role === 'ada') {
      displayName = 'Ada';
      roleColor = '#32CD32';
      accentBorder = '#32CD32';
      bg = 'linear-gradient(90deg, rgba(50, 205, 50, 0.14) 0%, rgba(20, 25, 40, 0.8) 100%)';
    }
  } else if (theme === 'architect') {
    if (msg.role === 'user') {
      isUser = true;
      displayName = 'You';
    } else if (msg.role === 'young_jarvis') {
      displayName = 'Young Jarvis';
      roleColor = '#FFD700';
      accentBorder = '#FFD700';
      bg = 'linear-gradient(90deg, rgba(255, 215, 0, 0.14) 0%, rgba(20, 25, 40, 0.8) 100%)';
    }
  } else {
    if (msg.role === 'You' || msg.role === 'user') {
      isUser = true;
      displayName = 'You';
    } else {
      displayName = 'Jarvis';
      roleColor = 'var(--cyan, #6ef6f7)';
    }
  }

  const bubbleStyle = isUser
    ? {
        alignSelf: 'flex-end',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22) 0%, rgba(14, 165, 233, 0.14) 100%)',
        border: '1px solid rgba(110, 246, 247, 0.35)',
        color: '#f8fafc',
        borderRadius: '16px 16px 4px 16px',
        padding: '12px 16px',
        marginBottom: '12px',
        maxWidth: '85%',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.92rem',
        lineHeight: '1.5',
        wordBreak: 'break-word',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        contain: 'content'
      }
    : {
        alignSelf: 'flex-start',
        background: bg,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderLeft: `3px solid ${accentBorder}`,
        color: '#e2e8f0',
        borderRadius: '16px 16px 16px 4px',
        padding: '12px 16px',
        marginBottom: '12px',
        maxWidth: '88%',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.92rem',
        lineHeight: '1.5',
        wordBreak: 'break-word',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        contain: 'content'
      };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%',
        animation: isLast ? 'fadeInUp 0.25s ease-out' : 'none',
        contain: 'content'
      }}
    >
      <div style={bubbleStyle}>
        <strong 
          style={{ 
            color: isUser ? '#6ef6f7' : roleColor, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '6px', 
            fontSize: '0.8rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.06em',
            fontFamily: 'DM Mono, monospace'
          }}
        >
          {msg.role === 'young_jarvis' && <Bot size={13} />}
          {displayName}
        </strong> 
        <div style={{ color: isUser ? '#fff' : '#f8fafc' }}>
          <FormattedMessage text={msg.message || ''} />
        </div>
        {msg.teaching_score && <TeachingScoreCard score={msg.teaching_score} />}
      </div>
    </div>
  );
});

const ChatPanel = ({ history = [], theme = 'default' }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const rafId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [history.length, history[history.length - 1]?.message]);

  return (
    <div 
      className="chat-history" 
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        scrollBehavior: 'smooth'
      }}
    >
      {history.length === 0 ? (
        <div style={{ color: 'var(--text-muted, #8e9bb9)', textAlign: 'center', margin: 'auto', fontSize: '0.9rem', opacity: 0.7 }}>
          No communications yet.
        </div>
      ) : (
        history.map((msg, idx) => (
          <MessageBubble 
            key={idx} 
            msg={msg} 
            theme={theme} 
            isLast={idx === history.length - 1} 
          />
        ))
      )}
    </div>
  );
};

export default memo(ChatPanel);
