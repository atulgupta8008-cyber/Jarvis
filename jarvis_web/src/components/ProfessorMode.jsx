import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, MessageSquare, Layout, FolderLock, Download } from 'lucide-react';
import SocraticChatPanel from './SocraticChatPanel';
import Blackboard from './Blackboard';
import ProfessorSidebar from './ProfessorSidebar';
import SessionMediaModal from './SessionMediaModal';
import { exportKnowledgeCapsule } from '../utils/exportKnowledgeCapsule';
import { WS_URL } from '../config';

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

export default function ProfessorMode({ onExit, initialQuestion, curiosityQuestion }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [blackboardWidgets, setBlackboardWidgets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionMedia, setSessionMedia] = useState([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('chat');
  const [researchStatus, setResearchStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentAct, setCurrentAct] = useState(0);
  const ws = useRef(null);
  const questionToAsk = initialQuestion || curiosityQuestion;
  const pendingQuestion = useRef(questionToAsk);

  useEffect(() => {
    if (questionToAsk) {
      pendingQuestion.current = questionToAsk;
      if (activeSessionId && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ 
          type: 'professor_query', 
          text: questionToAsk, 
          files: [], 
          session_id: activeSessionId,
          deep_research: false 
        }));
        setChatHistory(prev => [...prev, { role: 'user', message: questionToAsk }]);
        pendingQuestion.current = null;
      }
    }
  }, [initialQuestion, curiosityQuestion, activeSessionId]);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'professor_fetch_sessions', mode: 'professor' }));
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'professor' }));
    };
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'professor_stream_chunk') {
          setChatHistory((history) => {
            const next = [...history];
            const last = next.at(-1);
            if (last?.isStreaming) next[next.length - 1] = { ...last, message: last.message + data.chunk };
            else next.push({ role: 'jarvis', message: data.chunk, isStreaming: true });
            return next;
          });
        } else if (data.type === 'professor_chat') {
          const act = data.message.match(/\[ACT:(\d)\]/);
          if (act) setCurrentAct(Number(act[1]));
          const message = data.message.replace(/\[ACT:\d\]/g, '').trim();
          setChatHistory((history) => [...history.filter((item) => !item.isStreaming), { role: data.role, message }]);
        } else if (data.type === 'professor_history_loaded' && data.history) {
          setChatHistory(data.history.map((item) => ({ role: item.role === 'jarvis' ? 'jarvis' : 'user', message: item.content })));
        } else if (data.type === 'professor_sessions_loaded') {
          setSessions(data.sessions || []);
        } else if (data.type === 'professor_media_loaded') {
          setSessionMedia(data.media || []);
        } else if (data.type === 'professor_session_created') {
          setActiveSessionId(data.session_id);
          setChatHistory([]);
          setBlackboardWidgets([]);
          setSessionMedia([]);
          // Fetch media for this fresh session
          ws.current.send(JSON.stringify({ type: 'professor_fetch_media', session_id: data.session_id }));
          if (pendingQuestion.current) {
            ws.current.send(JSON.stringify({ type: 'professor_query', text: pendingQuestion.current, files: [], session_id: data.session_id }));
            setChatHistory([{ role: 'user', message: pendingQuestion.current }]);
            pendingQuestion.current = null;
          }
        } else if (data.type === 'blackboard_widget') {
          setBlackboardWidgets((widgets) => [...widgets, { id: data.id, type: data.widget_type, content: data.content, minimized: false }]);
        } else if (data.type === 'fractal_expanded') {
          setBlackboardWidgets((widgets) => widgets.map((widget) => {
            if (widget.id !== data.parent_id) return widget;
            const tree = widget.tree || { id: widget.id, equation: widget.content, children: [] };
            return { ...widget, tree: addChildToNode(tree, data.node_id, { id: `${data.node_id}_${Date.now()}`, equation: data.equation, explanation: data.explanation, children: [] }) };
          }));
        } else if (data.type === 'research_status') {
          setResearchStatus(data.status);
        } else if (data.type === 'professor_thinking') {
          setIsThinking(data.is_thinking);
        }
      } catch {
        // Ignore malformed socket events; the workspace remains usable.
      }
    };
    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'system_command', action: 'resume_voice_agent' }));
      ws.current?.close();
    };
  }, []);

  const send = (payload) => {
    if (ws.current?.readyState !== WebSocket.OPEN || !activeSessionId) return;
    ws.current.send(JSON.stringify({ type: 'professor_query', session_id: activeSessionId, ...payload }));
    setChatHistory((history) => [...history, { role: 'user', message: payload.text || '[File attached]' }]);
  };

  const createSession = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'professor' }));
    }
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
    setBlackboardWidgets([]);
    setSessionMedia([]);
    setIsSessionsOpen(false);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'professor_load_history', session_id: id, mode: 'professor' }));
      ws.current.send(JSON.stringify({ type: 'professor_fetch_media', session_id: id }));
    }
  };

  const deleteSession = (id) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify({ type: 'professor_delete_session', session_id: id, mode: 'professor' }));
  
  const handleUploadMedia = (fileObj) => {
    if (ws.current?.readyState === WebSocket.OPEN && activeSessionId) {
      ws.current.send(JSON.stringify({
        type: 'professor_upload_media',
        session_id: activeSessionId,
        file: fileObj
      }));
    }
  };

  const handleDeleteMedia = (sessionId, mediaId) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'professor_delete_media',
        session_id: sessionId,
        media_id: mediaId
      }));
    }
  };

  const handleExportCapsule = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    exportKnowledgeCapsule({
      title: activeSession?.session_title || 'Socratic Derivation Session',
      mode: 'professor',
      chatHistory,
      blackboardWidgets,
      sessionMedia
    });
  };

  const expandFractal = (widgetId, nodeId, targetVariable, context) => {
    setBlackboardWidgets((widgets) => widgets.map((widget) => widget.id === widgetId
      ? { ...widget, tree: setNodeLoading(widget.tree || { id: widget.id, equation: widget.content, children: [] }, nodeId, targetVariable) }
      : widget));
    ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify({ type: 'fractal_expand', context, target_variable: targetVariable, parent_id: widgetId, node_id: nodeId }));
  };

  return (
    <div className="forge-workspace">
      <AnimatePresence>
        {isSessionsOpen && (
          <motion.div 
            className="workspace-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSessionsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`workspace-sessions ${isSessionsOpen ? 'is-open' : ''}`}>
        <div className="workspace-close-sessions">
          <button className="workspace-icon-button" onClick={() => setIsSessionsOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <ProfessorSidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={selectSession} 
          onNewSession={createSession} 
          onDeleteSession={deleteSession} 
        />
      </div>

      {/* Header */}
      <div className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="workspace-icon-button" onClick={() => setIsSessionsOpen(true)} title="Open Sessions Sidebar">
            <Menu size={20} />
          </button>
          <div className="workspace-brand">JARVIS <span style={{ opacity: 0.5, fontWeight: 400 }}>// PROFESSOR</span></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Media Vault Action */}
          <button 
            className="workspace-action-pill"
            onClick={() => setIsMediaModalOpen(true)}
            title="Open Session Media Vault (PDFs & Documents)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(110, 246, 247, 0.08)',
              border: '1px solid rgba(110, 246, 247, 0.25)',
              color: 'var(--cyan, #6ef6f7)',
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FolderLock size={14} />
            <span>Vault</span>
            {sessionMedia.length > 0 && (
              <span style={{
                background: 'var(--cyan, #6ef6f7)',
                color: '#030508',
                borderRadius: '10px',
                padding: '0 6px',
                fontWeight: '700',
                fontSize: '10px'
              }}>
                {sessionMedia.length}
              </span>
            )}
          </button>

          {/* Export Capsule Action */}
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
              background: 'rgba(169, 150, 255, 0.08)',
              border: '1px solid rgba(169, 150, 255, 0.25)',
              color: 'var(--violet, #a996ff)',
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
            <LogOut size={15} /> <span>Exit</span>
          </button>
        </div>
      </div>

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
          className={mobilePane === 'board' ? 'is-selected' : ''} 
          onClick={() => setMobilePane('board')}
        >
          <Layout size={15} /> Board
        </button>
      </div>

      {/* Grid */}
      <div className="workspace-grid">
        <div className={`workspace-chat ${mobilePane === 'chat' ? 'is-mobile-active' : ''}`}>
          <div className="workspace-pane-label">Socratic Interface</div>
          <SocraticChatPanel 
            history={chatHistory} 
            onSendMessage={send} 
            isThinking={isThinking} 
            currentAct={currentAct} 
            onOpenMediaVault={() => setIsMediaModalOpen(true)}
            onUploadMedia={handleUploadMedia}
            mediaCount={sessionMedia.length}
          />
          {researchStatus && (
            <div className="workspace-research-status">
              {researchStatus}
            </div>
          )}
        </div>

        <div className={`workspace-board ${mobilePane === 'board' ? 'is-mobile-active' : ''}`}>
          <div className="workspace-pane-label">Synthesis Board</div>
          <Blackboard 
            widgets={blackboardWidgets} 
            setWidgets={setBlackboardWidgets} 
            onFractalExpand={expandFractal} 
          />
        </div>
      </div>

      {/* Session Media Vault Modal */}
      <SessionMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        sessionId={activeSessionId}
        media={sessionMedia}
        onUploadMedia={handleUploadMedia}
        onDeleteMedia={handleDeleteMedia}
      />
    </div>
  );
}
