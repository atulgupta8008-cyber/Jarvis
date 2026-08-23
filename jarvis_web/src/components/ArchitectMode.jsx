import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare, Layout, Download } from 'lucide-react';
import SocraticChatPanel from './SocraticChatPanel';
import Blackboard from './Blackboard';
import ProfessorSidebar from './ProfessorSidebar';
import { exportKnowledgeCapsule } from '../utils/exportKnowledgeCapsule';
import { WS_URL } from '../config';

import { useAuth } from '../context/AuthContext';

function addChildToNode(node, targetId, child) {
  if (node.id === targetId) return { ...node, children: [...(node.children || []), child], loadingVariable: null };
  return node.children?.length
    ? { ...node, children: node.children.map((item) => addChildToNode(item, targetId, child)) }
    : node;
}

function setNodeLoading(node, targetId, variable) {
  if (node.id === targetId) return { ...node, loadingVariable: variable };
  return node.children?.length
    ? { ...node, children: node.children.map((item) => setNodeLoading(item, targetId, variable)) }
    : node;
}

export default function ArchitectMode({ onExit }) {
  const { user, profile, isAdmin } = useAuth();
  const [chatHistory, setChatHistory] = useState([]);
  const [blackboardWidgets, setBlackboardWidgets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // Forge design system state
  const [mobilePane, setMobilePane] = useState('chat');
  const [hasUnseenBoard, setHasUnseenBoard] = useState(false);
  const mobilePaneRef = useRef(mobilePane);
  useEffect(() => {
    mobilePaneRef.current = mobilePane;
  }, [mobilePane]);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const [researchStatus, setResearchStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const ws = useRef(null);

  const myUserId = user?.id || (isAdmin ? 'admin_master' : null);

  useEffect(() => {
    // Isolated WebSocket connection for Architect Mode
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      // Fetch session list on load
      ws.current.send(JSON.stringify({ 
        type: 'professor_fetch_sessions', 
        mode: 'architect',
        user_id: myUserId,
        role: isAdmin ? 'admin' : 'user'
      }));
      // Mute the voice agent
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
      // Auto-create a brand new session for Architect Mode
      ws.current.send(JSON.stringify({ 
        type: 'professor_create_session', 
        mode: 'architect',
        user_id: myUserId,
        role: isAdmin ? 'admin' : 'user'
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Strict ownership check: reject any message tagged for a different account
        const isMyMessage = !data.user_id || data.user_id === myUserId;
        if (!isMyMessage) return;
        
        // INTERCEPTOR LOGIC
        if (data.type === 'professor_chat') {
          setResearchStatus('');
          const message = data.message.replace(/\[ACT:\d\]/g, '').trim();
          setChatHistory(prev => [...prev.filter(item => !item.isStreaming), { role: data.role, message, teaching_score: data.teaching_score }]);
        } else if (data.type === 'professor_history_loaded') {
          setResearchStatus('');
          if (data.history) {
            setChatHistory(data.history.map(msg => ({ role: msg.role === 'young_jarvis' ? 'young_jarvis' : 'user', message: msg.content })));
          }
        } else if (data.type === 'professor_sessions_loaded') {
          if (data.mode === 'architect') {
            setSessions(data.sessions || []);
          }
        } else if (data.type === 'professor_session_created') {
          if (data.mode === 'architect') {
            setActiveSessionId(data.session_id);
            setResearchStatus('');
            setChatHistory([]);
            setBlackboardWidgets([]);
          }
        } else if (data.type === 'blackboard_widget') {
          setBlackboardWidgets(prev => [...prev, {
            id: data.id,
            type: data.widget_type,
            content: data.content,
            minimized: false
          }]);
          if (mobilePaneRef.current === 'chat') {
            setHasUnseenBoard(true);
          }
        } else if (data.type === 'fractal_expanded') {
          setBlackboardWidgets((widgets) => widgets.map((widget) => {
            if (widget.id !== data.parent_id) return widget;
            const tree = widget.tree || { id: widget.id, equation: widget.content, children: [] };
            return { ...widget, tree: addChildToNode(tree, data.node_id, { id: `${data.node_id}_${Date.now()}`, equation: data.equation, explanation: data.explanation, children: [] }) };
          }));
          if (mobilePaneRef.current === 'chat') {
            setHasUnseenBoard(true);
          }
        } else if (data.type === 'research_status') {
          setResearchStatus(data.status);
          if (data.status && (
            data.status.toLowerCase().includes('complete') || 
            data.status.toLowerCase().includes('finish') || 
            data.status.toLowerCase().includes('done') || 
            data.status.toLowerCase().includes('whiteboard') ||
            data.status.toLowerCase().includes('rendering')
          )) {
            setTimeout(() => setResearchStatus(''), 3500);
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
  }, [myUserId]);

  const handleSendMessage = (payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const currentSession = activeSessionId || `session_${Date.now()}`;
      if (!activeSessionId) setActiveSessionId(currentSession);
      setResearchStatus('');
      ws.current.send(JSON.stringify({ 
        type: 'professor_query', 
        text: payload.text,
        files: payload.files,
        deep_research: false,
        is_architect_mode: true,
        session_id: currentSession,
        user_profile: profile,
        role: isAdmin ? 'admin' : 'user',
        user_id: myUserId
      }));
      setChatHistory(prev => [...prev, { role: 'user', message: payload.text || "[File Attached]" }]);
    }
  };

  const handleNewSession = () => {
    setResearchStatus('');
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'architect', user_id: myUserId }));
    }
  };

  const handleSelectSession = (id) => {
    setActiveSessionId(id);
    setResearchStatus('');
    setBlackboardWidgets([]); // Clear blackboard for new topic
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_load_history', session_id: id, mode: 'architect', user_id: myUserId }));
    }
    if (window.innerWidth <= 640) setIsSessionsOpen(false);
  };

  const handleDeleteSession = (id) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_delete_session', session_id: id, mode: 'architect', user_id: myUserId }));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setResearchStatus('');
        setChatHistory([]);
        setBlackboardWidgets([]);
      }
    }
  };

  const expandFractal = (widgetId, nodeId, targetVariable, context) => {
    setBlackboardWidgets((widgets) => widgets.map((widget) => widget.id === widgetId
      ? { ...widget, tree: setNodeLoading(widget.tree || { id: widget.id, equation: widget.content, children: [] }, nodeId, targetVariable) }
      : widget));
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        type: 'fractal_expand', 
        context, 
        target_variable: targetVariable, 
        parent_id: widgetId, 
        node_id: nodeId,
        user_id: myUserId 
      }));
    } else {
      setTimeout(() => {
        setBlackboardWidgets((widgets) => widgets.map((widget) => {
          if (widget.id !== widgetId) return widget;
          const tree = widget.tree || { id: widget.id, equation: widget.content, children: [] };
          return {
            ...widget,
            tree: addChildToNode(tree, nodeId, {
              id: `${nodeId}_${Date.now()}`,
              equation: `${targetVariable} = \\lim_{\\Delta t \\to 0} \\frac{\\Delta ${targetVariable.replace(/\\/g, '')}}{\\Delta t}`,
              explanation: `Fundamental definition of ${targetVariable} derived from first principles calculus.`,
              children: []
            })
          };
        }));
      }, 600);
    }
  };

  const handleExportCapsule = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const lastScoreMsg = [...chatHistory].reverse().find(m => m.teaching_score);
    exportKnowledgeCapsule({
      title: activeSession?.session_title || 'Architect Systems Thinking Session',
      mode: 'architect',
      chatHistory,
      blackboardWidgets,
      sessionMedia: [],
      teachingScore: lastScoreMsg?.teaching_score || null
    });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="workspace-icon-button"
            onClick={() => setIsSessionsOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="workspace-brand">
            ARCHITECT <span>Forge</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="workspace-action-pill"
            onClick={handleExportCapsule}
            title="Export Knowledge Capsule (Printable HTML / PDF Summary)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 209, 101, 0.08)',
              border: '1px solid rgba(255, 209, 101, 0.25)',
              color: 'var(--amber, #ffd165)',
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button className="workspace-exit" onClick={onExit} title="Exit Session">
            <X size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Mobile Pane Switcher */}
      <div className="workspace-mobile-switch">
        <button 
          type="button"
          className={mobilePane === 'chat' ? 'is-selected' : ''} 
          onClick={() => setMobilePane('chat')}
        >
          <MessageSquare size={15} /> Chat
        </button>
        <button 
          type="button"
          className={`${mobilePane === 'board' ? 'is-selected' : ''} ${hasUnseenBoard && mobilePane === 'chat' ? 'has-unseen' : ''}`} 
          onClick={() => {
            setMobilePane('board');
            setHasUnseenBoard(false);
          }}
        >
          <Layout size={15} /> Board
          {blackboardWidgets.length > 0 && (
            <span className="board-count-pill">{blackboardWidgets.length}</span>
          )}
          {hasUnseenBoard && mobilePane === 'chat' && (
            <span className="board-beacon-dot" title="New content on board" />
          )}
        </button>
      </div>

      <main className="workspace-grid">
        {/* Chat Pane */}
        <div className={`workspace-chat ${mobilePane === 'chat' ? 'is-mobile-active' : ''}`}>
          <SocraticChatPanel 
            history={chatHistory} 
            onSendMessage={handleSendMessage} 
            isThinking={isThinking} 
            theme="architect"
          />
          
          <AnimatePresence>
            {researchStatus && (
              <motion.div 
                className="workspace-research-status"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span>{researchStatus}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Blackboard / Graph Pane */}
        <div className={`workspace-board ${mobilePane === 'board' ? 'is-mobile-active' : ''}`}>
          <Blackboard 
            widgets={blackboardWidgets} 
            setWidgets={setBlackboardWidgets} 
            onFractalExpand={expandFractal} 
          />
        </div>
      </main>

      {/* Sidebar Drawer */}
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
