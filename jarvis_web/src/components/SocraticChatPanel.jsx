import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Atom, Network, FolderLock, Plus } from 'lucide-react';
import ChatPanel from './ChatPanel'; 

const THOUGHT_STAGES = [
  "Accessing knowledge graph...",
  "Synthesizing response vectors...",
  "Formulating Socratic explanation...",
  "Structuring conceptual derivation..."
];

export default function SocraticChatPanel({ 
  history, 
  onSendMessage, 
  isThinking, 
  theme = "professor", 
  currentAct = 0,
  onOpenMediaVault,
  onUploadMedia,
  mediaCount = 0
}) {
  const [inputText, setInputText] = useState('');
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isEpiphanyMode, setIsEpiphanyMode] = useState(false);
  const [isColliderMode, setIsColliderMode] = useState(false);
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) {
      setThoughtIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % THOUGHT_STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isThinking]);

  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (onUploadMedia) {
          onUploadMedia({
            name: file.name,
            mime: file.type || 'application/pdf',
            size: file.size,
            data: reader.result
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, [onUploadMedia]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.md', '.py', '.js', '.c', '.cpp', '.json'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  });

  const handleSend = () => {
    if (inputText.trim() === '') return;
    onSendMessage({
      text: inputText,
      files: [],
      deep_research: isDeepResearch,
      is_epiphany_mode: isEpiphanyMode,
      is_collider_mode: isColliderMode
    });
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div {...getRootProps()} className="socratic-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', flex: '1 1 0%', minHeight: 0, position: 'relative', overflow: 'hidden', outline: 'none' }}>
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'rgba(110, 246, 247, 0.08)', 
          border: '2px dashed var(--cyan, #6ef6f7)', 
          borderRadius: '16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          gap: '8px'
        }}>
          <FolderLock size={32} color="var(--cyan, #6ef6f7)" />
          <h2 style={{ color: 'var(--cyan, #6ef6f7)', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
            Drop Course Materials to Session Vault
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#8e9bb9', fontFamily: 'DM Mono, monospace' }}>
            Auto-saves to Supabase & attaches to this chat session
          </span>
        </div>
      )}

      {/* Shrinkable Chat Stream Area */}
      <div className="socratic-chat-scroll-area" style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', marginBottom: '8px', position: 'relative', paddingRight: '4px' }}>
        {isEpiphanyMode && currentAct > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '6px 10px', marginBottom: '8px',
            background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.03) 0%, transparent 100%)',
            borderLeft: '2px solid rgba(255, 215, 0, 0.4)', borderRadius: '0 8px 8px 0',
            fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', fontWeight: 500,
            color: 'rgba(255, 215, 0, 0.8)', letterSpacing: '0.5px'
          }}>
            <span>⏳ TIME MACHINE</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3].map(act => (
                <div key={act} style={{
                  width: '32px', height: '3px', borderRadius: '1.5px',
                  background: act <= currentAct ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255, 215, 0, 0.1)',
                  transition: 'all 0.4s ease'
                }} />
              ))}
            </div>
            <span style={{ color: 'rgba(255, 215, 0, 0.5)' }}>
              {currentAct === 1 ? 'THE SCENE' : currentAct === 2 ? 'INVESTIGATION' : 'BREAKTHROUGH'}
            </span>
          </div>
        )}
        <ChatPanel history={history} theme={theme} />
        
        {isThinking && (
          <div style={{
            display: 'flex', flexDirection: 'column', padding: '10px 14px', marginTop: '8px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 100%)', 
            borderLeft: '2px solid var(--cyan, #6ef6f7)', borderRadius: '0 8px 8px 0',
            color: '#8e9bb9', fontSize: '0.85rem', fontFamily: 'Space Grotesk, sans-serif',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: 600, color: '#f4f7ff' }}>
              <div className="pulse-dot" style={{ background: 'var(--cyan, #6ef6f7)' }}></div>
              <span>Processing</span>
            </div>
            <div style={{ height: '18px', position: 'relative', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={thoughtIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--forge-muted, #8e9bb9)',
                    fontFamily: 'DM Mono, monospace',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {THOUGHT_STAGES[thoughtIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="socratic-input-bar" style={{ 
        position: 'relative', display: 'flex', alignItems: 'center', 
        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: '24px', padding: '4px 8px', backdropFilter: 'blur(10px)',
        gap: '6px', flexShrink: 0
      }}>
        {/* Session Media Vault Button */}
        {onOpenMediaVault && (
          <button
            type="button"
            onClick={onOpenMediaVault}
            title="Open Session Media Vault (PDFs & Course Documents)"
            style={{
              background: mediaCount > 0 ? 'rgba(110, 246, 247, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: mediaCount > 0 ? '1px solid rgba(110, 246, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              color: mediaCount > 0 ? 'var(--cyan, #6ef6f7)' : '#8e9bb9',
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <FolderLock size={13} />
            <span>Vault</span>
            {mediaCount > 0 ? (
              <span style={{
                background: 'var(--cyan, #6ef6f7)',
                color: '#030508',
                borderRadius: '8px',
                padding: '0 4px',
                fontWeight: '700',
                fontSize: '9px'
              }}>
                {mediaCount}
              </span>
            ) : (
              <Plus size={11} style={{ opacity: 0.6 }} />
            )}
          </button>
        )}

        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={theme === 'architect' ? "Explain system..." : "Ask Professor Jarvis..."}
          style={{
            flex: 1, padding: '8px 6px', background: 'transparent', border: 'none',
            color: '#f4f7ff', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', fontSize: '0.9rem',
            minWidth: 0
          }}
        />
        
        <button 
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            background: inputText.trim() ? 'var(--cyan, #6ef6f7)' : 'rgba(255,255,255,0.04)',
            border: 'none', borderRadius: '50%', width: '32px', height: '32px', 
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: inputText.trim() ? '#030508' : '#4a5568',
            transition: 'all 0.25s ease',
            flexShrink: 0
          }}
        >
          <Send size={14} />
        </button>
      </div>
      
      {/* Fixed Bottom Cognitive Mode Switching Keys */}
      {theme !== 'architect' && (
        <div className="socratic-cognitive-tools" style={{ 
          marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '4px 10px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '20px', backdropFilter: 'blur(4px)', alignSelf: 'center', flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.02)', padding: '3px 7px', borderRadius: '10px' }}>
            <Atom size={11} style={{ color: isColliderMode ? '#a78bfa' : '#4a5568' }} />
            <span style={{ color: isColliderMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.6rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Collide</span>
            <div onClick={() => setIsColliderMode(!isColliderMode)} style={{
              width: '22px', height: '13px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isColliderMode ? '#a78bfa' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isColliderMode ? '11px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.02)', padding: '3px 7px', borderRadius: '10px' }}>
            <Sparkles size={11} style={{ color: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : '#4a5568' }} />
            <span style={{ color: isEpiphanyMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.6rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Epiphany</span>
            <div onClick={() => setIsEpiphanyMode(!isEpiphanyMode)} style={{
              width: '22px', height: '13px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isEpiphanyMode ? '11px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.02)', padding: '3px 7px', borderRadius: '10px' }}>
            <Network size={11} style={{ color: isDeepResearch ? 'var(--cyan, #6ef6f7)' : '#4a5568' }} />
            <span style={{ color: isDeepResearch ? '#f4f7ff' : '#8e9bb9', fontSize: '0.6rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Research</span>
            <div onClick={() => setIsDeepResearch(!isDeepResearch)} style={{
              width: '22px', height: '13px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isDeepResearch ? 'var(--cyan, #6ef6f7)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isDeepResearch ? '11px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
