import React, { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatPanel = ({ history, theme = 'default' }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
  }, [history]);

  return (
    <div className="chat-history" ref={scrollRef}>
      {history.length === 0 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
          No communications yet.
        </div>
      )}
      <AnimatePresence>
        {history.map((msg, idx) => {
          let customStyle = {};
          let displayName = 'Jarvis';
          let isUser = false;
          
          if (theme === 'professor') {
             if (msg.role === 'user') {
                 isUser = true;
                 displayName = 'You';
             } else if (msg.role === 'vance') {
                 displayName = 'Dr. Vance';
                 customStyle = {
                     borderLeft: '3px solid #FF4500',
                     background: 'linear-gradient(90deg, rgba(255, 69, 0, 0.1) 0%, rgba(255, 69, 0, 0) 100%)',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                 };
             } else if (msg.role === 'ada') {
                 displayName = 'Ada';
                 customStyle = {
                     borderLeft: '3px solid #32CD32',
                     background: 'linear-gradient(90deg, rgba(50, 205, 50, 0.1) 0%, rgba(50, 205, 50, 0) 100%)',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                 };
             }
          } else if (theme === 'architect') {
             if (msg.role === 'user') {
                 isUser = true;
                 displayName = 'You';
             } else if (msg.role === 'young_jarvis') {
                 displayName = 'Young Jarvis';
                 customStyle = {
                     borderLeft: '3px solid #FFD700',
                     background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0) 100%)'
                 };
             }
          } else {
             if (msg.role === 'You' || msg.role === 'user') {
                 isUser = true;
                 displayName = 'You';
             } else {
                 displayName = 'Jarvis';
             }
          }
          
          // Base styles for the glass chat bubbles
          const baseBubbleStyle = {
            padding: '14px 18px',
            borderRadius: '16px',
            marginBottom: '16px',
            maxWidth: '85%',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.95rem',
            lineHeight: '1.5',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            position: 'relative',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            wordWrap: 'break-word',
            ...customStyle
          };

          const userStyle = {
            ...baseBubbleStyle,
            alignSelf: 'flex-end',
            background: 'linear-gradient(135deg, rgba(0, 119, 255, 0.2), rgba(0, 243, 255, 0.1))',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            color: '#fff',
            borderBottomRightRadius: '4px'
          };

          const jarvisStyle = {
            ...baseBubbleStyle,
            alignSelf: 'flex-start',
            background: customStyle.background || 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: customStyle.borderLeft || '1px solid rgba(255, 255, 255, 0.08)',
            color: '#e2e8f0',
            borderBottomLeftRadius: '4px'
          };

          const finalStyle = isUser ? userStyle : jarvisStyle;
          
          const isAI = !isUser;
          
          const cinematicInitial = isAI 
            ? { opacity: 0, y: 25, filter: 'blur(10px)' } 
            : { opacity: 0, y: 15, scale: 0.98 };
            
          const cinematicAnimate = isAI 
            ? { opacity: 1, y: 0, filter: 'blur(0px)' } 
            : { opacity: 1, y: 0, scale: 1 };
            
          const cinematicTransition = isAI 
            ? { duration: 0.7, ease: [0.16, 1, 0.3, 1] } // Smooth cinematic ease-out
            : { type: "spring", stiffness: 250, damping: 25 };

          return (
            <motion.div 
              key={idx} 
              style={{ display: 'flex', flexDirection: 'column', width: '100%', willChange: 'transform, opacity, filter' }}
              initial={cinematicInitial}
              animate={cinematicAnimate}
              transition={cinematicTransition}
            >
              <div style={finalStyle}>
                <strong style={{ 
                  color: isUser ? '#00f3ff' : (msg.role === 'vance' ? '#FF4500' : msg.role === 'ada' ? '#32CD32' : msg.role === 'young_jarvis' ? '#FFD700' : '#94a3b8'), 
                  display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' 
                }}>
                  {msg.role === 'young_jarvis' && <Bot size={14} />}
                  {displayName}
                </strong> 
                <div style={{ color: isUser ? '#fff' : '#f8fafc', whiteSpace: 'pre-wrap' }}>
                  {msg.message}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(ChatPanel);
