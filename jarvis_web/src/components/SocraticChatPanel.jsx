import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Send, Sparkles, Atom, Network, FolderLock, Plus } from 'lucide-react';
import ChatPanel from './ChatPanel'; 

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
    <div {...getRootProps()} className="socratic-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', outline: 'none' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', position: 'relative', paddingRight: '5px' }}>
        {isEpiphanyMode && currentAct > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '8px 12px', marginBottom: '12px',
            background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.03) 0%, transparent 100%)',
            borderLeft: '2px solid rgba(255, 215, 0, 0.4)', borderRadius: '0 8px 8px 0',
            fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', fontWeight: 500,
            color: 'rgba(255, 215, 0, 0.8)', letterSpacing: '0.5px'
          }}>
            <span>⏳ TIME MACHINE</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3].map(act => (
                <div key={act} style={{
                  width: '40px', height: '3px', borderRadius: '1.5px',
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
            display: 'flex', flexDirection: 'column', padding: '12px 16px', marginTop: '12px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)', 
            borderLeft: '2px solid rgba(255,255,255,0.2)', borderRadius: '0 8px 8px 0',
            color: '#8e9bb9', fontSize: '0.85rem', fontFamily: 'Space Grotesk, sans-serif',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: 500 }}>
              <div className="pulse-dot" style={{ background: '#8e9bb9' }}></div>
              <span>Processing</span>
            </div>
            <div className="thought-stream" style={{ fontSize: '0.75rem', color: '#4a5568' }}>
              <div className="thought-text">Accessing knowledge graph...</div>
              <div className="thought-text">Synthesizing response vectors...</div>
              <div className="thought-text">Formulating explanation...</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar with Direct Media Vault Button */}
      <div style={{ 
        position: 'relative', display: 'flex', alignItems: 'center', 
        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: '24px', padding: '6px 10px', backdropFilter: 'blur(10px)',
        gap: '6px'
      }}>
        {/* New Media Vault File Button (Replaces old one-off attachment) */}
        {onOpenMediaVault && (
          <button
            type="button"
            onClick={onOpenMediaVault}
            title="Open Session Media Vault (PDFs & Course Documents)"
            style={{
              background: mediaCount > 0 ? 'rgba(110, 246, 247, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: mediaCount > 0 ? '1px solid rgba(110, 246, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: mediaCount > 0 ? 'var(--cyan, #6ef6f7)' : '#8e9bb9',
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <FolderLock size={14} />
            <span>Vault</span>
            {mediaCount > 0 ? (
              <span style={{
                background: 'var(--cyan, #6ef6f7)',
                color: '#030508',
                borderRadius: '8px',
                padding: '0 5px',
                fontWeight: '700',
                fontSize: '10px'
              }}>
                {mediaCount}
              </span>
            ) : (
              <Plus size={12} style={{ opacity: 0.6 }} />
            )}
          </button>
        )}

        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={theme === 'architect' ? "Explain the system to Young Jarvis..." : "Ask Professor Jarvis..."}
          style={{
            flex: 1, padding: '10px 6px', background: 'transparent', border: 'none',
            color: '#f4f7ff', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', fontSize: '0.95rem'
          }}
        />
        
        <button 
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            background: inputText.trim() ? 'var(--cyan, #6ef6f7)' : 'rgba(255,255,255,0.04)',
            border: 'none', borderRadius: '50%', padding: '10px', 
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: inputText.trim() ? '#030508' : '#4a5568',
            transition: 'all 0.25s ease'
          }}
        >
          <Send size={16} />
        </button>
      </div>
      
      {/* Socratic Cognitive Tools (Neo/Zen removed) */}
      {theme !== 'architect' && (
        <div style={{ 
          marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '6px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '20px', backdropFilter: 'blur(4px)', alignSelf: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
            <Atom size={12} style={{ color: isColliderMode ? '#a78bfa' : '#4a5568' }} />
            <span style={{ color: isColliderMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Collide</span>
            <div onClick={() => setIsColliderMode(!isColliderMode)} style={{
              width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isColliderMode ? '#a78bfa' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isColliderMode ? '12px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
            <Sparkles size={12} style={{ color: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : '#4a5568' }} />
            <span style={{ color: isEpiphanyMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Epiphany</span>
            <div onClick={() => setIsEpiphanyMode(!isEpiphanyMode)} style={{
              width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isEpiphanyMode ? '12px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
            <Network size={12} style={{ color: isDeepResearch ? 'var(--cyan, #6ef6f7)' : '#4a5568' }} />
            <span style={{ color: isDeepResearch ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'DM Mono, monospace', fontWeight: '500' }}>Research</span>
            <div onClick={() => setIsDeepResearch(!isDeepResearch)} style={{
              width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
              background: isDeepResearch ? 'var(--cyan, #6ef6f7)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isDeepResearch ? '12px' : '2px', transition: 'left 0.25s ease' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
