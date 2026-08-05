import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, Send, File as FileIcon, Sparkles, Atom, Network, Moon } from 'lucide-react';
import ChatPanel from './ChatPanel'; 

export default function SocraticChatPanel({ history, onSendMessage, isThinking, theme = "professor", isZenMode, onToggleZen, currentAct = 0 }) {
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isEpiphanyMode, setIsEpiphanyMode] = useState(false);
  const [isColliderMode, setIsColliderMode] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles(prev => [...prev, { name: file.name, mime: file.type, data: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });
  const { getRootProps: getBtnProps, getInputProps: getBtnInputProps } = useDropzone({ onDrop });

  const handleSend = () => {
    if (inputText.trim() === '' && attachedFiles.length === 0) return;
    onSendMessage({
      text: inputText,
      files: attachedFiles,
      deep_research: isDeepResearch,
      is_epiphany_mode: isEpiphanyMode,
      is_collider_mode: isColliderMode
    });
    setInputText('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const removeFile = (index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  return (
    <div {...getRootProps()} className="socratic-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', outline: 'none' }}>
      <input {...getInputProps()} />
      
      {isDragActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'color-mix(in srgb, var(--forge-cyan, #67e8f9) 5%, transparent)', 
          border: '1px dashed color-mix(in srgb, var(--forge-cyan, #67e8f9) 20%, transparent)', 
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }}>
          <h2 style={{ color: 'var(--forge-cyan, #67e8f9)', fontFamily: 'Inter', fontWeight: 500, fontSize: '1rem' }}>Drop Files Here</h2>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', position: 'relative', paddingRight: '5px' }}>
        {isEpiphanyMode && currentAct > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '8px 12px', marginBottom: '12px',
            background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.03) 0%, transparent 100%)',
            borderLeft: '2px solid rgba(255, 215, 0, 0.4)', borderRadius: '0 8px 8px 0',
            fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 500,
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
            color: '#8e9bb9', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
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

      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {attachedFiles.map((file, i) => (
            <div key={i} style={{ 
              background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--forge-line, rgba(255,255,255,0.06))', 
              padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', color: '#f4f7ff',
              display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter'
            }}>
              <FileIcon size={12} color="#8e9bb9" />
              {file.name}
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', marginLeft: '5px', padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        position: 'relative', display: 'flex', alignItems: 'center', 
        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)', 
        borderRadius: '24px', padding: '6px 10px', backdropFilter: 'blur(10px)'
      }}>
        <div {...getBtnProps()} className="attach-btn" style={{ 
          cursor: 'pointer', padding: '8px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.25s ease'
        }}>
          <input {...getBtnInputProps()} />
          <Paperclip size={18} color="#8e9bb9" />
        </div>

        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Professor Jarvis..."
          style={{
            flex: 1, padding: '10px', background: 'transparent', border: 'none',
            color: '#f4f7ff', fontFamily: 'Inter, sans-serif', outline: 'none', fontSize: '0.95rem'
          }}
        />
        
        <button 
          onClick={handleSend}
          style={{
            background: (inputText || attachedFiles.length > 0) ? 'color-mix(in srgb, var(--forge-cyan, #67e8f9) 80%, transparent)' : 'rgba(255,255,255,0.04)',
            border: 'none', borderRadius: '50%', padding: '10px', cursor: (inputText || attachedFiles.length > 0) ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: (inputText || attachedFiles.length > 0) ? '#050505' : '#4a5568',
            transition: 'all 0.25s ease'
          }}
        >
          <Send size={16} />
        </button>
      </div>
      
      <div style={{ 
        marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '8px 12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '20px', backdropFilter: 'blur(4px)', alignSelf: 'center'
      }}>
        {theme !== 'architect' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
              <Atom size={12} style={{ color: isColliderMode ? '#a78bfa' : '#4a5568' }} />
              <span style={{ color: isColliderMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'Inter', fontWeight: '500' }}>Collide</span>
              <div onClick={() => setIsColliderMode(!isColliderMode)} style={{
                width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
                background: isColliderMode ? '#a78bfa' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isColliderMode ? '12px' : '2px', transition: 'left 0.25s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
              <Sparkles size={12} style={{ color: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : '#4a5568' }} />
              <span style={{ color: isEpiphanyMode ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'Inter', fontWeight: '500' }}>Epiphany</span>
              <div onClick={() => setIsEpiphanyMode(!isEpiphanyMode)} style={{
                width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
                background: isEpiphanyMode ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isEpiphanyMode ? '12px' : '2px', transition: 'left 0.25s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
              <Network size={12} style={{ color: isDeepResearch ? 'var(--forge-cyan, #67e8f9)' : '#4a5568' }} />
              <span style={{ color: isDeepResearch ? '#f4f7ff' : '#8e9bb9', fontSize: '0.62rem', fontFamily: 'Inter', fontWeight: '500' }}>Research</span>
              <div onClick={() => setIsDeepResearch(!isDeepResearch)} style={{
                width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
                background: isDeepResearch ? 'var(--forge-cyan, #67e8f9)' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isDeepResearch ? '12px' : '2px', transition: 'left 0.25s ease' }} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '12px' }}>
          <Moon size={12} style={{ color: isZenMode ? '#f4f7ff' : '#4a5568' }} />
          <div onClick={onToggleZen} style={{
            width: '24px', height: '14px', borderRadius: '7px', cursor: 'pointer', position: 'relative',
            background: isZenMode ? '#f4f7ff' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s ease'
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isZenMode ? '#050505' : '#8e9bb9', position: 'absolute', top: '2px', left: isZenMode ? '12px' : '2px', transition: 'left 0.25s ease' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
