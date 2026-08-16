import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Send, Sparkles, Bug, Lightbulb, FlaskConical, 
  BrainCircuit, Star, CheckCircle, AlertTriangle, Compass, Users, Bot
} from 'lucide-react';
import { WEB3FORMS_ACCESS_KEY, API_URL } from '../config';

const TOPICS = [
  { id: 'General Feedback', label: 'General Experience', icon: Lightbulb, color: 'var(--cyan, #6ef6f7)' },
  { id: 'Professor Mode', label: 'Professor Mode', icon: BrainCircuit, color: 'var(--cyan, #6ef6f7)' },
  { id: 'Architect Mode', label: 'Architect Mode', icon: Compass, color: '#a78bfa' },
  { id: 'Study Group Mode', label: 'Study Group', icon: Users, color: '#f43f5e' },
  { id: 'Jarvis Assistant', label: 'Jarvis Assistant', icon: Bot, color: '#34d399' },
  { id: 'Simulation Issue', label: 'Simulations', icon: FlaskConical, color: '#38bdf8' },
  { id: 'Bug Report', label: 'Bug Report', icon: Bug, color: '#f87171' },
  { id: 'Feature Request', label: 'Feature Request', icon: Sparkles, color: '#ffd165' }
];

export default function FeedbackModal({ isOpen, onClose }) {
  const [topic, setTopic] = useState('General Feedback');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Load saved name and email from localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('jarvis_feedback_name') || '';
      const savedEmail = localStorage.getItem('jarvis_feedback_email') || '';
      if (savedName) setName(savedName);
      if (savedEmail) setEmail(savedEmail);
    } catch {
      // Ignore localStorage errors
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      // Save name/email for future convenience
      try {
        if (name) localStorage.setItem('jarvis_feedback_name', name);
        if (email) localStorage.setItem('jarvis_feedback_email', email);
      } catch {
        // Ignore localStorage errors
      }

      const diagnostics = includeDiagnostics ? {
        screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      } : null;

      let submitted = false;

      // Tier 1: Try sending via backend API proxy
      try {
        const backendRes = await fetch(`${API_URL}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || 'Anonymous Explorer',
            email: email.trim() || 'no-reply@jarvis-os.ai',
            topic,
            rating: `${rating} / 5 Stars`,
            message: message.trim(),
            diagnostics: diagnostics ? JSON.stringify(diagnostics, null, 2) : 'Opted out'
          })
        });
        if (backendRes.ok) {
          const resData = await backendRes.json();
          if (resData.success) {
            submitted = true;
          }
        }
      } catch {
        // Fall back to direct Web3Forms POST
      }

      // Tier 2: Direct Web3Forms submission if backend proxy was unavailable
      if (!submitted) {
        const activeKey = WEB3FORMS_ACCESS_KEY || '430cbfce-3745-4425-959e-a9909eb7c128';

        const payload = {
          access_key: activeKey,
          subject: `[Jarvis Feedback] ${topic} from ${name.trim() || 'Anonymous Explorer'}`,
          from_name: name.trim() || 'Jarvis Explorer',
          name: name.trim() || 'Anonymous Explorer',
          email: email.trim() || 'no-reply@jarvis-os.ai',
          topic,
          rating: `${rating} / 5 Stars`,
          message: message.trim(),
          diagnostics: diagnostics ? JSON.stringify(diagnostics, null, 2) : 'Opted out',
          botcheck: ''
        };

        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          submitted = true;
        } else {
          throw new Error(result.message || 'Transmission failed. Please try again later.');
        }
      }

      if (submitted) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setMessage('');
        }, 2200);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Network connection error while submitting feedback.');
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="modal-scrim" 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 5, 8, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: 'linear-gradient(145deg, rgba(16, 22, 38, 0.96), rgba(8, 12, 22, 0.98))',
            border: '1px solid rgba(110, 246, 247, 0.2)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6), 0 0 30px rgba(110, 246, 247, 0.1)',
            color: '#f4f7ff',
            fontFamily: 'Space Grotesk, sans-serif',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(110, 246, 247, 0.12)',
                border: '1px solid rgba(110, 246, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyan, #6ef6f7)'
              }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Send Signal & Feedback
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#8e9bb9', fontFamily: 'DM Mono, monospace' }}>
                  Direct transmission to the Jarvis development team
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8e9bb9',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8e9bb9'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
              <X size={16} />
            </button>
          </div>

          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.15)',
                border: '2px solid #34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                boxShadow: '0 0 25px rgba(52, 211, 153, 0.3)'
              }}>
                <CheckCircle size={36} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Syne, sans-serif', color: '#f4f7ff' }}>
                Signal Transmitted Successfully!
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#8e9bb9', maxWidth: '340px', lineHeight: 1.5 }}>
                Thank you for contributing your thoughts. Your feedback helps us make Jarvis faster, smarter, and more capable.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Topic / Mode Selection Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: '#8e9bb9', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Select Topic / Mode
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TOPICS.map((t) => {
                    const isSelected = topic === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopic(t.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '0.76rem',
                          fontFamily: 'DM Mono, monospace',
                          border: isSelected ? `1px solid ${t.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected ? 'rgba(110, 246, 247, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? t.color : '#8e9bb9',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        <Icon size={13} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: '#8e9bb9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Satisfaction Rating
                  </label>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: 'var(--cyan, #6ef6f7)' }}>
                    {rating} / 5 Stars
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: isFilled ? '#fbbf24' : 'rgba(255, 255, 255, 0.15)',
                          transition: 'transform 0.15s ease, color 0.15s ease'
                        }}
                      >
                        <Star size={22} fill={isFilled ? '#fbbf24' : 'transparent'} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Email Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: '#8e9bb9', marginBottom: '6px' }}>
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Explorer"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      color: '#f4f7ff',
                      fontSize: '0.85rem',
                      fontFamily: 'Space Grotesk, sans-serif',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: '#8e9bb9', marginBottom: '6px' }}>
                    Email (For replies)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      color: '#f4f7ff',
                      fontSize: '0.85rem',
                      fontFamily: 'Space Grotesk, sans-serif',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Feedback Message */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontFamily: 'DM Mono, monospace', color: '#8e9bb9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Message / Thoughts / Bug Details *
                  </label>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'DM Mono, monospace', color: '#6b7a94' }}>
                    {message.length}/1000
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your experience, suggest a new tool, report a glitch, or tell us what you'd like to see next..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#f4f7ff',
                    fontSize: '0.88rem',
                    fontFamily: 'Space Grotesk, sans-serif',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    minHeight: '90px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Diagnostics Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#8e9bb9' }}>
                <input
                  type="checkbox"
                  id="diag-checkbox"
                  checked={includeDiagnostics}
                  onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  style={{ accentColor: 'var(--cyan, #6ef6f7)', cursor: 'pointer' }}
                />
                <label htmlFor="diag-checkbox" style={{ cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: '0.72rem' }}>
                  Attach browser & display diagnostics to help reproduce issues
                </label>
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'DM Mono, monospace'
                }}>
                  <AlertTriangle size={14} flexShrink={0} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#8e9bb9',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    background: message.trim() ? 'var(--cyan, #6ef6f7)' : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: message.trim() ? '#030508' : '#4a5568',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: message.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: message.trim() ? '0 0 16px rgba(110, 246, 247, 0.35)' : 'none'
                  }}
                >
                  {status === 'sending' ? (
                    <>Transmitting...</>
                  ) : (
                    <>
                      <span>Transmit Signal</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
