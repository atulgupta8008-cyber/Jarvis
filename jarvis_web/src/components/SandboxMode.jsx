import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Zap, FlaskConical, MessageSquare, LayoutDashboard } from 'lucide-react';
import { WS_URL } from '../config';
import Blackboard from './Blackboard';
import ChatPanel from './ChatPanel';

export default function SandboxMode({ onExit }) {
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mobileActivePane, setMobileActivePane] = useState('chat'); // 'chat' | 'board'
  const [hasUnseenBoard, setHasUnseenBoard] = useState(false);
  const mobileActivePaneRef = useRef(mobileActivePane);
  useEffect(() => {
    mobileActivePaneRef.current = mobileActivePane;
  }, [mobileActivePane]);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'sandbox' }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'professor_session_created') {
          setSessionId(data.session_id);
        } else if (data.type === 'professor_stream_chunk') {
          setChatMessages(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].isStreaming) {
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                message: newHistory[newHistory.length - 1].message + data.chunk
              };
            } else {
              newHistory.push({ role: 'jarvis', message: data.chunk, isStreaming: true });
            }
            return newHistory;
          });
        } else if (data.type === 'professor_chat') {
          setChatMessages(prev => {
            const filtered = prev.filter(msg => !msg.isStreaming);
            return [...filtered, { role: data.role, message: data.message }];
          });
          setIsThinking(false);
        } else if (data.type === 'blackboard_widget') {
          setWidgets(prev => [...prev, {
            id: data.id || `widget-${Date.now()}`,
            type: data.widget_type || data.board_type,
            content: data.content,
            minimized: false
          }]);
          if (mobileActivePaneRef.current === 'chat') {
            setHasUnseenBoard(true);
          }
        } else if (data.type === 'deep_research_status') {
          setIsThinking(true);
        }
      } catch {}
    };

    return () => {
      if (ws.current) {
        ws.current.send(JSON.stringify({ type: 'system_command', action: 'resume_voice_agent' }));
        ws.current.close();
      }
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || !sessionId || !ws.current) return;
    const text = inputText.trim();
    setInputText('');
    setChatMessages(prev => [...prev, { role: 'user', message: text }]);
    setIsThinking(true);

    ws.current.send(JSON.stringify({
      type: 'professor_query',
      session_id: sessionId,
      text: text,
      files: [],
      is_sandbox_mode: true
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="forge-workspace sandbox-forge"
    >
      <header className="workspace-header">
        <button onClick={onExit} className="workspace-exit">
          <ArrowLeft size={16} /> Back to Nexus
        </button>
        <div className="workspace-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd700' }}>
          <Zap size={16} /> SANDBOX
        </div>
        <div style={{ width: '100px' }} />
      </header>

      <div className="workspace-mobile-switch">
        <button 
          className={mobileActivePane === 'chat' ? 'is-selected' : ''} 
          onClick={() => setMobileActivePane('chat')}
        >
          <MessageSquare size={16} /> Chat
        </button>
        <button 
          className={`${mobileActivePane === 'board' ? 'is-selected' : ''} ${hasUnseenBoard && mobileActivePane === 'chat' ? 'has-unseen' : ''}`} 
          onClick={() => {
            setMobileActivePane('board');
            setHasUnseenBoard(false);
          }}
        >
          <LayoutDashboard size={16} /> Canvas
          {widgets.length > 0 && (
            <span className="board-count-pill">{widgets.length}</span>
          )}
          {hasUnseenBoard && mobileActivePane === 'chat' && (
            <span className="board-beacon-dot" title="New content on canvas" />
          )}
        </button>
      </div>

      <div className="workspace-grid" style={{ flex: 1, overflow: 'hidden' }}>
        <div className={`workspace-chat ${mobileActivePane === 'chat' ? 'is-mobile-active' : ''}`}>
          <div className="workspace-pane-label" style={{ fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: 600, color: '#8e9bb9', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            SIMULATION LOG
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <ChatPanel history={chatMessages} theme="professor" />
          </div>
        </div>

        <div className={`workspace-board ${mobileActivePane === 'board' ? 'is-mobile-active' : ''}`}>
          {widgets.length === 0 && !isThinking && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: '16px', color: '#8e9bb9'
            }}>
              <FlaskConical size={48} style={{ opacity: 0.5 }} />
              <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>
                ASK "WHAT IF...?"
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: '0.85rem', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
                Type any "What if" scenario and watch the universe respond with real physics simulations.
              </div>
            </div>
          )}
          {isThinking && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#ffd700', fontFamily: 'Inter', fontSize: '0.85rem',
                fontWeight: 600, letterSpacing: '1px'
              }}
            >
              ⚡ SIMULATING...
            </motion.div>
          )}
          {widgets.length > 0 && (
            <div style={{ width: '100%', height: '100%', minHeight: 0 }}>
              <Blackboard widgets={widgets} setWidgets={setWidgets} />
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'center', background: 'rgba(5,5,5,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '8px 8px 8px 20px',
          width: '100%', maxWidth: '700px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <span style={{ color: '#ffd700', fontSize: '0.85rem', fontFamily: 'Inter', fontWeight: 500 }}>What if</span>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="gravity was 10x stronger..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#f4f7ff', fontSize: '0.95rem', fontFamily: 'Inter'
            }}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: inputText.trim() ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.04)',
              border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'all 0.25s ease',
              boxShadow: inputText.trim() ? '0 0 10px rgba(255,215,0,0.2)' : 'none'
            }}
          >
            <Send size={16} color={inputText.trim() ? '#050505' : '#4a5568'} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
