import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare, Layout } from 'lucide-react';
import SocraticChatPanel from './SocraticChatPanel';
import Blackboard from './Blackboard';
import ProfessorSidebar from './ProfessorSidebar';
import { WS_URL } from '../config';

export default function ArchitectMode({ onExit }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [blackboardWidgets, setBlackboardWidgets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // Forge design system state
  const [mobilePane, setMobilePane] = useState('chat');
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const [researchStatus, setResearchStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Isolated WebSocket connection for Professor Mode
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      console.log('Architect Mode Connected');
      // Fetch session list on load
      ws.current.send(JSON.stringify({ type: 'professor_fetch_sessions', mode: 'architect' }));
      // Mute the voice agent
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // INTERCEPTOR LOGIC
        if (data.type === 'professor_chat') {
          setChatHistory(prev => [...prev, { role: data.role, message: data.message }]);
        } else if (data.type === 'professor_history_loaded') {
          if (data.history) {
            setChatHistory(data.history.map(msg => ({ role: msg.role === 'young_jarvis' ? 'young_jarvis' : 'user', message: msg.content })));
          }
        } else if (data.type === 'professor_sessions_loaded') {
          setSessions(data.sessions || []);
          // If no active session, create one (or load the first if we wanted to)
          // Actually, if we just booted up and don't have an active session, let's create a new one automatically
          // Only if sessions is empty or we haven't picked one yet.
          // We will wait for the first user action or explicitly click "New Session".
        } else if (data.type === 'professor_session_created') {
          setActiveSessionId(data.session_id);
          setChatHistory([]);
          setBlackboardWidgets([]);
        } else if (data.type === 'blackboard_widget') {
          setBlackboardWidgets(prev => [...prev, {
            id: data.id,
            type: data.widget_type,
            content: data.content,
            minimized: false
          }]);
        } else if (data.type === 'research_status') {
          setResearchStatus(data.status);
          if (data.status.includes('Complete')) {
            setTimeout(() => setResearchStatus(''), 3000);
          }
        } else if (data.type === 'professor_thinking') {
          setIsThinking(data.is_thinking);
        }
      } catch (err) {
        console.error('Error parsing Professor WS message:', err);
      }
    };

    return () => { 
      if (ws.current) {
        if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'system_command', action: 'resume_voice_agent' }));
        }
        ws.current.close(); 
      }
    };
  }, []);

  // Ensure there's always an active session
  useEffect(() => {
    if (!activeSessionId && sessions.length === 0 && ws.current?.readyState === WebSocket.OPEN) {
      handleNewSession();
    } else if (!activeSessionId && sessions.length > 0) {
      // Auto-load the most recent session
      handleSelectSession(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const handleSendMessage = (payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && activeSessionId) {
      ws.current.send(JSON.stringify({ 
        type: 'professor_query', 
        text: payload.text,
        files: payload.files,
        deep_research: false,
        is_architect_mode: true,
        session_id: activeSessionId 
      }));
      setChatHistory(prev => [...prev, { role: 'user', message: payload.text || "[File Attached]" }]);
    }
  };

  const handleNewSession = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'architect' }));
    }
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    setBlackboardWidgets([]); // Clear blackboard for new topic
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_load_history', session_id: id, mode: 'architect' }));
    }
    if (window.innerWidth <= 640) setIsSessionsOpen(false);
  };

  const handleDeleteSession = (id) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_delete_session', session_id: id, mode: 'architect' }));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setChatHistory([]);
        setBlackboardWidgets([]);
      }
    }
  };

  return (
    <motion.div 
      className="forge-workspace architect-forge"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <header className="workspace-header">
        <button 
          className="workspace-icon-button"
          onClick={() => setIsSessionsOpen(true)}
        >
          <Menu size={20} />
        </button>

        <div className="workspace-brand">
          ARCHITECT <span>Forge</span>
        </div>

        <div className="workspace-mobile-switch">
          <button 
            className={mobilePane === 'chat' ? 'is-selected' : ''} 
            onClick={() => setMobilePane('chat')}
          >
            <MessageSquare size={16} /> Chat
          </button>
          <button 
            className={mobilePane === 'board' ? 'is-selected' : ''} 
            onClick={() => setMobilePane('board')}
          >
            <Layout size={16} /> Board
          </button>
        </div>

        <button className="workspace-exit" onClick={onExit}>
          <X size={16} />
          <span>Exit</span>
        </button>
      </header>

      <main className="workspace-grid">
        {/* Chat Pane */}
        <div className={`workspace-chat ${mobilePane === 'chat' ? 'is-mobile-active' : ''}`}>
          <SocraticChatPanel 
            history={chatHistory} 
            onSendMessage={handleSendMessage} 
            isThinking={isThinking} 
            theme="architect"
          />
          
          {/* Deep Research Terminal Overlay */}
          <AnimatePresence>
            {researchStatus && (
              <motion.div 
                className="workspace-research-status"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <h3>&gt; SYSTEM.SWARM_PROTOCOL</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <motion.p 
                    key={researchStatus}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {researchStatus}
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >_</motion.span>
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Board Pane */}
        <div className={`workspace-board ${mobilePane === 'board' ? 'is-mobile-active' : ''}`}>
          <Blackboard widgets={blackboardWidgets} setWidgets={setBlackboardWidgets} />
        </div>
      </main>

      {/* Sessions Sidebar Overlay */}
      <AnimatePresence>
        {isSessionsOpen && (
          <>
            <motion.div 
              className="workspace-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSessionsOpen(false)}
            />
            <div className={`workspace-sessions ${isSessionsOpen ? 'is-open' : ''}`}>
              <button 
                className="workspace-close-sessions"
                onClick={() => setIsSessionsOpen(false)}
              >
                <X size={20} />
              </button>
              <ProfessorSidebar 
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onDeleteSession={handleDeleteSession}
              />
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
