import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default React.memo(function ProfessorSidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      {/* New Chat Button */}
      <button 
        onClick={onNewSession}
        style={{
          width: '100%',
          padding: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--forge-line, rgba(255, 255, 255, 0.08))',
          color: 'var(--forge-primary, #f4f7ff)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          cursor: 'pointer',
          fontFamily: 'Inter',
          fontWeight: '500',
          marginBottom: '24px',
          transition: 'all 0.25s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
        }}
      >
        <Plus size={18} /> New Session
      </button>

      {/* Session List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        <h3 style={{ fontSize: '0.75rem', color: 'var(--forge-muted, #8e9bb9)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontWeight: '600', paddingLeft: '4px' }}>
          Recent Sessions
        </h3>
        
        {sessions.map((session) => (
          <motion.div 
            key={session.id}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            style={{
              padding: '12px 14px',
              background: activeSessionId === session.id ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
              border: '1px solid var(--forge-line, rgba(255, 255, 255, 0.06))',
              borderLeft: activeSessionId === session.id ? '3px solid #67e8f9' : '1px solid var(--forge-line, rgba(255, 255, 255, 0.06))',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.25s ease',
              boxShadow: activeSessionId === session.id ? '0 0 10px rgba(103, 232, 249, 0.05)' : 'none'
            }}
            onClick={() => onSelectSession(session.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <span style={{ 
                color: activeSessionId === session.id ? 'var(--forge-primary, #f4f7ff)' : 'var(--forge-muted, #8e9bb9)',
                fontWeight: activeSessionId === session.id ? '500' : '400',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.88rem',
                fontFamily: 'Inter'
              }}>
                {session.session_title}
              </span>
            </div>
            
            {/* Delete Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--forge-muted, #8e9bb9)',
                cursor: 'pointer',
                opacity: activeSessionId === session.id ? 0.8 : 0.4,
                padding: '4px',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = 'var(--forge-muted, #8e9bb9)';
                e.currentTarget.style.opacity = activeSessionId === session.id ? '0.8' : '0.4';
              }}
              title="Delete Session"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}

        {sessions.length === 0 && (
          <div style={{ color: 'var(--forge-muted, #8e9bb9)', fontSize: '0.85rem', textAlign: 'center', marginTop: '30px', fontStyle: 'italic' }}>
            No recent sessions found.
          </div>
        )}
      </div>
    </div>
  );
});
