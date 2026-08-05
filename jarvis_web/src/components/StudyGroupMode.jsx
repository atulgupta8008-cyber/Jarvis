import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Send, File as FileIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ChatPanel from './ChatPanel';
import Blackboard from './Blackboard';
import { WS_URL } from '../config';

export default function StudyGroupMode({ onExit }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [blackboardWidgets, setBlackboardWidgets] = useState([]);
  const [researchStatus, setResearchStatus] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [targetAgent, setTargetAgent] = useState('all');
  const ws = useRef(null);
  const [mobileActivePane, setMobileActivePane] = useState('chat');

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'professor_create_session', mode: 'study_group' }));
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'pause_voice_agent' }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
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
          setChatHistory(prev => {
            const filtered = prev.filter(msg => !msg.isStreaming);
            return [...filtered, { role: data.role, message: data.message }];
          });
        } else if (data.type === 'professor_session_created') {
          setActiveSessionId(data.session_id);
          setChatHistory([]);
          setBlackboardWidgets([]);
        } else if (data.type === 'blackboard_widget') {
          setBlackboardWidgets(prev => [...prev, {
            id: data.id,
            type: data.widget_type,
            content: data.content,
            author: data.author,
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
  }, []);

  const handleSendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && activeSessionId) {
      if (!inputText.trim() && attachedFiles.length === 0) return;

      ws.current.send(JSON.stringify({ 
        type: 'professor_query', 
        text: inputText,
        files: attachedFiles,
        deep_research: false,
        is_study_group: true,
        target_agent: targetAgent,
        session_id: activeSessionId 
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

  const vanceHistory = chatHistory.filter(msg => msg.role === 'user' || msg.role === 'vance');
  const adaHistory = chatHistory.filter(msg => msg.role === 'user' || msg.role === 'ada');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="forge-workspace study-forge"
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* 1. Header (div:nth-of-type(1)) */}
      <div className="workspace-header">
        <div className="workspace-brand">
          <div className="workspace-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          STUDY GROUP
          <small>COLLABORATIVE REASONING</small>
        </div>
        
        <div className="workspace-header-actions">
          <button className="workspace-exit" onClick={onExit}>
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>

      {/* 2. Left Pane - Dr. Vance (div:nth-of-type(2)) */}
      <div className="workspace-chat" style={{ flex: 1, border: '1px solid var(--forge-line)', background: 'var(--forge-surface)', backdropFilter: 'blur(10px)', borderRadius: '16px', margin: '0 6px 12px 12px' }}>
        <h2 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--forge-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--forge-amber)', display: 'inline-block', boxShadow: '0 0 8px var(--forge-amber)' }}></span>
          Dr. Vance (Skeptic)
        </h2>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ChatPanel history={vanceHistory} theme="professor" />
          {isThinking && (
            <div style={{ color: 'var(--forge-amber)', fontSize: '0.8rem', marginTop: '10px', fontFamily: 'Inter' }}>Vance is thinking...</div>
          )}
        </div>
      </div>

      {/* 3. Center Pane - Blackboard & Input (div:nth-of-type(3)) */}
      <div className="workspace-board" style={{ flex: 2, display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid var(--forge-line)', background: 'var(--forge-surface)', backdropFilter: 'blur(10px)', borderRadius: '16px', margin: '0 6px 12px 6px', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Blackboard widgets={blackboardWidgets} setWidgets={setBlackboardWidgets} />
        </div>
        
        {researchStatus && (
          <div className="workspace-research-status" style={{ left: '50%', transform: 'translateX(-50%)', bottom: 'auto' }}>
            {researchStatus}
          </div>
        )}

        <div style={{ padding: '16px', borderTop: '1px solid var(--forge-line)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
          {/* File Drop Zone */}
          <div 
            {...getRootProps()} 
            style={{
              padding: '10px',
              border: `1px dashed var(--forge-line)`,
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '12px',
              background: isDragActive ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'all 0.25s ease'
            }}
          >
            <input {...getInputProps()} />
            <p style={{ margin: 0, fontSize: '0.75rem', color: isDragActive ? 'var(--forge-cyan)' : 'var(--forge-muted)', fontFamily: 'Inter' }}>
              {isDragActive ? "Drop here..." : "Drag PDFs/Images to share with the group"}
            </p>
          </div>

          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {attachedFiles.map((file, i) => (
                <div key={i} style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--forge-line)', 
                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--forge-text)',
                  display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter'
                }}>
                  <FileIcon size={12} color="var(--forge-muted)" />
                  {file.name}
                  <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', color: 'var(--forge-muted)', cursor: 'pointer', marginLeft: '5px' }}>x</button>
                </div>
              ))}
            </div>
          )}

          {/* Target Agent Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => setTargetAgent('all')}
              style={{
                background: targetAgent === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: targetAgent === 'all' ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--forge-line)',
                color: targetAgent === 'all' ? 'var(--forge-text)' : 'var(--forge-muted)',
                padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.75rem',
                transition: 'all 0.25s ease'
              }}
            >
              All (Debate)
            </button>
            <button 
              onClick={() => setTargetAgent('vance')}
              style={{
                background: targetAgent === 'vance' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                border: targetAgent === 'vance' ? '1px solid var(--forge-amber)' : '1px solid var(--forge-line)',
                color: targetAgent === 'vance' ? 'var(--forge-amber)' : 'var(--forge-muted)',
                padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.75rem',
                transition: 'all 0.25s ease'
              }}
            >
              Dr. Vance
            </button>
            <button 
              onClick={() => setTargetAgent('ada')}
              style={{
                background: targetAgent === 'ada' ? 'rgba(103, 232, 249, 0.15)' : 'transparent',
                border: targetAgent === 'ada' ? '1px solid var(--forge-cyan)' : '1px solid var(--forge-line)',
                color: targetAgent === 'ada' ? 'var(--forge-cyan)' : 'var(--forge-muted)',
                padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'Inter', fontSize: '0.75rem',
                transition: 'all 0.25s ease'
              }}
            >
              Ada
            </button>
          </div>

          {/* Text Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Address the study group..."
              style={{
                flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--forge-line)',
                color: 'var(--forge-text)', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontFamily: 'Inter',
                fontSize: '0.85rem'
              }}
            />
            <button 
              onClick={handleSendMessage}
              style={{
                background: 'rgba(103, 232, 249, 0.1)', color: 'var(--forge-cyan)', border: '1px solid var(--forge-cyan)', padding: '0 16px',
                borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: 'Inter', fontSize: '0.85rem', transition: 'all 0.25s ease'
              }}
            >
              <Send size={16} /> Pitch
            </button>
          </div>
        </div>
      </div>

      {/* 4. Right Pane - Ada (div:nth-of-type(4)) */}
      <div className="workspace-chat" style={{ flex: 1, border: '1px solid var(--forge-line)', background: 'var(--forge-surface)', backdropFilter: 'blur(10px)', borderRadius: '16px', margin: '0 12px 12px 6px' }}>
        <h2 style={{ fontFamily: 'Inter', fontWeight: 600, color: 'var(--forge-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--forge-cyan)', display: 'inline-block', boxShadow: '0 0 8px var(--forge-cyan)' }}></span>
          Ada (Creative)
        </h2>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ChatPanel history={adaHistory} theme="professor" />
          {isThinking && (
            <div style={{ color: 'var(--forge-cyan)', fontSize: '0.8rem', marginTop: '10px', fontFamily: 'Inter' }}>Ada is thinking...</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

