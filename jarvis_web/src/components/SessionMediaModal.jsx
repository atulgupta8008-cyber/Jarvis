import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, FileText, Trash2, Upload, FileCheck, Sparkles, FolderLock } from 'lucide-react';

export default function SessionMediaModal({
  isOpen,
  onClose,
  sessionId,
  media = [],
  onUploadMedia,
  onDeleteMedia
}) {
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onUploadMedia?.({
          name: file.name,
          mime: file.type || 'application/pdf',
          size: file.size,
          data: reader.result
        });
      };
      reader.readAsDataURL(file);
    });
  }, [onUploadMedia]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.md', '.py', '.js', '.c', '.cpp', '.json'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  });

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(10px, 3vw, 20px)'
        }}
      >
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(3, 5, 8, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            background: 'rgba(10, 14, 24, 0.98)',
            border: '1px solid rgba(110, 246, 247, 0.25)',
            borderRadius: '20px',
            padding: 'clamp(18px, 4vw, 30px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(110, 246, 247, 0.1)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '11px',
                color: 'var(--cyan, #6ef6f7)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px'
              }}>
                <FolderLock size={14} /> Session Media Vault
              </div>
              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '1.6rem',
                fontWeight: '700',
                color: '#fff',
                margin: 0
              }}>
                Course Documents & Materials
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Socratic Context Notice */}
          <div style={{
            background: 'rgba(110, 246, 247, 0.04)',
            border: '1px solid rgba(110, 246, 247, 0.15)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: '#c8d0e0',
            fontFamily: 'DM Mono, monospace',
            marginBottom: '20px'
          }}>
            <Sparkles size={16} color="var(--cyan, #6ef6f7)" />
            <span>Files in this vault are isolated to this chat session and continuously referenced by the Professor.</span>
          </div>

          {/* Upload Dropzone */}
          <div
            {...getRootProps()}
            style={{
              border: isDragActive ? '2px dashed var(--cyan, #6ef6f7)' : '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '24px 20px',
              textAlign: 'center',
              background: isDragActive ? 'rgba(110, 246, 247, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'all 0.2s'
            }}
          >
            <input {...getInputProps()} />
            <Upload size={24} style={{ color: 'var(--cyan, #6ef6f7)', marginBottom: '8px' }} />
            <p style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: '#fff', fontWeight: '500' }}>
              Drop PDF, textbook chapters, or code files here
            </p>
            <span style={{ fontSize: '0.75rem', color: '#8e9bb9', fontFamily: 'DM Mono, monospace' }}>
              Uploads persist to Supabase & link exclusively to session #{sessionId?.slice(0, 8) || 'current'}
            </span>
          </div>

          {/* Media Items List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#8e9bb9',
              fontFamily: 'DM Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px'
            }}>
              <span>Indexed Materials ({media.length})</span>
              <span>Status: Synchronized</span>
            </div>

            {media.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#6b7a94',
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.85rem'
              }}>
                No documents uploaded for this chat yet. Upload a PDF above to ground the Professor's teaching.
              </div>
            ) : (
              media.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: item.name?.endsWith('.pdf') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(110, 246, 247, 0.15)',
                      color: item.name?.endsWith('.pdf') ? '#ef4444' : 'var(--cyan, #6ef6f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        color: '#fff',
                        fontSize: '0.92rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.name}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.75rem',
                        color: '#8e9bb9',
                        fontFamily: 'DM Mono, monospace',
                        marginTop: '3px'
                      }}>
                        <span>{formatSize(item.size)}</span>
                        <span>•</span>
                        <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FileCheck size={12} /> Active in teaching context
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => onDeleteMedia?.(sessionId, item.id)}
                    title="Delete file from session vault"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8e9bb9',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#8e9bb9'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
