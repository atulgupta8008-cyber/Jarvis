import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Send, File as FileIcon, Users, ShieldAlert, Sparkles, MessageSquare, Layout } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ChatPanel from './ChatPanel';
import Blackboard from './Blackboard';
import { useAuth } from '../context/AuthContext';
import { WS_URL } from '../config';
import './StudyGroup.css';

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

export default function StudyGroupMode({ onExit }) {
  const { user, profile, isAdmin } = useAuth();
  const [chatHistory, setChatHistory] = useState([]);
  const [blackboardWidgets, setBlackboardWidgets] = useState([]);
  const [researchStatus, setResearchStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [targetAgent, setTargetAgent] = useState('all');
  const [mobileTab, setMobileTab] = useState('chat');
  const ws = useRef(null);

  const myUserId = user?.id || (isAdmin ? 'admin_master' : 'guest_local');

  // Clear history on user account switch
  useEffect(() => {
    setActiveSessionId(null);
    setChatHistory([]);
    setBlackboardWidgets([]);
  }, [myUserId]);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ 
        type: 'professor_create_session', 
        mode: 'study_group',
        user_id: myUserId,
        role: isAdmin ? 'admin' : 'user'
      }));
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Strict ownership check: reject any message tagged for a different account
        const isMyMessage = !data.user_id || data.user_id === myUserId;
        if (!isMyMessage) return;

        if (data.type === 'professor_stream_chunk') {
          setChatHistory(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].isStreaming) {
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                message: newHistory[newHistory.length - 1].message + data.chunk
              };
            } else {
              newHistory.push({ role: data.role || 'jarvis', message: data.chunk, isStreaming: true });
            }
            return newHistory;
          });
        } else if (data.type === 'professor_chat') {
          setResearchStatus('');
          setChatHistory(prev => {
            const filtered = prev.filter(msg => !msg.isStreaming);
            return [...filtered, { role: data.role, message: data.message }];
          });
        } else if (data.type === 'professor_session_created') {
          if (data.mode === 'study_group') {
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
            author: data.author,
            minimized: false
          }]);
        } else if (data.type === 'fractal_expanded') {
          setBlackboardWidgets((widgets) => widgets.map((widget) => {
            if (widget.id !== data.parent_id) return widget;
            const tree = widget.tree || { id: widget.id, equation: widget.content, children: [] };
            return { ...widget, tree: addChildToNode(tree, data.node_id, { id: `${data.node_id}_${Date.now()}`, equation: data.equation, explanation: data.explanation, children: [] }) };
          }));
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
      } catch {
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

  const handleSendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && activeSessionId) {
      if (!inputText.trim() && attachedFiles.length === 0) return;
      setResearchStatus('');

      ws.current.send(JSON.stringify({ 
        type: 'professor_query', 
        text: inputText,
        files: attachedFiles,
        deep_research: false,
        is_study_group: true,
        target_agent: targetAgent,
        session_id: activeSessionId,
        user_id: myUserId,
        role: isAdmin ? 'admin' : 'user',
        user_profile: profile
      }));
      setChatHistory(prev => [...prev, { role: 'user', message: inputText || "[File Attached]" }]);
      setInputText('');
      setAttachedFiles([]);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          mime: file.type,
          data: reader.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, accept: {'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf']}
  });

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const expandFractal = (widgetId, nodeId, targetVariable, context) => {
    setBlackboardWidgets((widgets) => widgets.map((widget) => widget.id === widgetId
      ? { ...widget, tree: setNodeLoading(widget.tree || { id: widget.id, equation: widget.content, children: [] }, nodeId, targetVariable) }
      : widget));
    ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify({ type: 'fractal_expand', context, target_variable: targetVariable, parent_id: widgetId, node_id: nodeId }));
  };

  const vanceHistory = chatHistory.filter(msg => msg.role === 'user' || msg.role === 'vance');
  const adaHistory = chatHistory.filter(msg => msg.role === 'user' || msg.role === 'ada');

  // Common Pitch Dock Component to render in both Desktop and Mobile Chat
  const renderPitchDock = (isMobile = false) => (
    <div className={`study-pitch-dock ${isMobile ? 'is-mobile-dock' : ''}`}>
      {/* File Drop Zone */}
      <div 
        {...getRootProps()} 
        className={`study-dropzone ${isDragActive ? 'is-drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <p>
          {isDragActive ? "Drop documents here..." : "Drag PDFs/Images to share with the group"}
        </p>
      </div>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="study-attachments-preview">
          {attachedFiles.map((file, i) => (
            <div key={i} className="study-attachment-chip">
              <FileIcon size={12} color="var(--forge-muted)" />
              <span>{file.name}</span>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Target Agent Selector */}
      <div className="study-target-agent-bar">
        <button 
          type="button"
          className={`study-target-btn ${targetAgent === 'all' ? 'selected all' : ''}`}
          onClick={() => setTargetAgent('all')}
        >
          All (Debate)
        </button>
        <button 
          type="button"
          className={`study-target-btn ${targetAgent === 'vance' ? 'selected vance' : ''}`}
          onClick={() => setTargetAgent('vance')}
        >
          Dr. Vance (Skeptic)
        </button>
        <button 
          type="button"
          className={`study-target-btn ${targetAgent === 'ada' ? 'selected ada' : ''}`}
          onClick={() => setTargetAgent('ada')}
        >
          Ada (Creative)
        </button>
      </div>

      {/* Text Input & Pitch Button */}
      <div className="study-input-row">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Pitch idea to the study group..."
          className="study-text-input"
        />
        <button 
          type="button"
          onClick={handleSendMessage}
          disabled={!inputText.trim() && attachedFiles.length === 0}
          className="study-pitch-btn"
        >
          <Send size={15} /> <span>Pitch</span>
        </button>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="forge-workspace study-group-workspace-root"
    >
      {/* 1. Full-Width Top Header Bar */}
      <header className="study-group-header">
        <div className="study-group-brand">
          <div className="study-group-brand-icon">
            <Users size={16} color="var(--forge-cyan)" />
          </div>
          <div className="study-group-title">
            STUDY GROUP <span>// COLLABORATIVE REASONING</span>
          </div>
        </div>

        {/* EXACTLY 2 TABS ON MOBILE: Debate Chat & Blackboard */}
        <div className="study-group-mobile-tabs">
          <button 
            type="button"
            className={mobileTab === 'chat' ? 'active' : ''} 
            onClick={() => setMobileTab('chat')}
          >
            <MessageSquare size={13} /> Debate Chat {chatHistory.length > 0 && `(${chatHistory.length})`}
          </button>
          <button 
            type="button"
            className={mobileTab === 'board' ? 'active' : ''} 
            onClick={() => setMobileTab('board')}
          >
            <Layout size={13} /> Blackboard {blackboardWidgets.length > 0 && `(${blackboardWidgets.length})`}
          </button>
        </div>
        <div className="study-group-header-actions">
          <button className="workspace-exit" onClick={onExit}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* 2. Main Stage (Desktop 3-Column | Mobile 2-Pane Switcher) */}
      <main className="study-group-stage-grid">
        
        {/* DESKTOP LEFT COLUMN: Dr. Vance (Skeptic) */}
        <section className="study-agent-pane vance-pane desktop-only-pane">
          <div className="study-agent-header vance-header">
            <div className="study-agent-badge vance-dot" />
            <div className="study-agent-name">
              Dr. Vance <span className="study-agent-role">SKEPTIC</span>
            </div>
            {isThinking && <span className="agent-thinking-pill">Thinking...</span>}
          </div>
          <div className="study-agent-chat-body">
            <ChatPanel history={vanceHistory} theme="professor" />
          </div>
        </section>

        {/* DESKTOP RIGHT COLUMN: Ada (Creative) */}
        <section className="study-agent-pane ada-pane desktop-only-pane">
          <div className="study-agent-header ada-header">
            <div className="study-agent-badge ada-dot" />
            <div className="study-agent-name">
              Ada <span className="study-agent-role">ADVOCATE</span>
            </div>
            {isThinking && <span className="agent-thinking-pill">Thinking...</span>}
          </div>
          <div className="study-agent-chat-body">
            <ChatPanel history={adaHistory} theme="professor" />
          </div>
        </section>

        {/* WINDOW 1 (Mobile Debate Chat Only): Unified Vance & Ada Chat with Mobile Pitch Console */}
        <section className={`study-mobile-chat-pane ${mobileTab === 'chat' ? 'is-mobile-active' : ''}`}>
          <div className="study-mobile-chat-header">
            <div className="study-mobile-agents-status">
              <span className="agent-tag vance">Dr. Vance (Skeptic)</span>
              <span className="agent-divider">⚡</span>
              <span className="agent-tag ada">Ada (Advocate)</span>
            </div>
            {isThinking && <span className="agent-thinking-pill">Processing...</span>}
          </div>

          <div className="study-agent-chat-body">
            <ChatPanel history={chatHistory} theme="professor" />
          </div>

          {/* Unified Bottom Pitch Dock for Mobile */}
          {renderPitchDock(true)}
        </section>

        {/* WINDOW 2 (Desktop Center & Mobile Window 2): Interactive Blackboard */}
        <section className={`study-center-pane ${mobileTab === 'board' ? 'is-mobile-active' : ''}`}>
          <div className="study-blackboard-wrapper">
            <Blackboard widgets={blackboardWidgets} setWidgets={setBlackboardWidgets} onFractalExpand={expandFractal} />
            
            {researchStatus && (
              <div className="workspace-research-status">
                {researchStatus}
              </div>
            )}
          </div>

          {/* Desktop Pitch Dock below Blackboard */}
          <div className="desktop-pitch-wrapper">
            {renderPitchDock(false)}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
