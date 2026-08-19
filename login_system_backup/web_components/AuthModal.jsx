import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, User, Lock, Mail, ArrowRight, X, KeyRound, CheckCircle, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, signInAdmin, continueAsGuest } = useAuth();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || 'Sign in failed. Check credentials.');
        } else {
          onClose();
        }
      } else if (tab === 'signup') {
        if (!displayName.trim()) {
          setErrorMsg('Please enter your name.');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setErrorMsg(error.message || 'Sign up failed.');
        } else {
          onClose();
        }
      } else if (tab === 'admin') {
        const res = signInAdmin(adminKey);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Invalid Admin Key');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100000 }}>
      <motion.div 
        className="auth-modal-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(6, 9, 18, 0.94)',
          border: '1px solid rgba(110, 246, 247, 0.2)',
          borderRadius: '20px',
          padding: '32px',
          color: '#f4f7ff',
          position: 'relative',
          boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(110, 246, 247, 0.1)',
          backdropFilter: 'blur(24px)'
        }}
      >
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: '#8994ad',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(110, 246, 247, 0.2), rgba(169, 150, 255, 0.2))',
            border: '1px solid rgba(110, 246, 247, 0.3)',
            marginBottom: 12
          }}>
            {tab === 'admin' ? <Shield size={22} color="var(--amber, #ffd165)" /> : <Sparkles size={22} color="var(--cyan, #6ef6f7)" />}
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.45rem', fontWeight: 700, margin: '0 0 6px' }}>
            {tab === 'signin' && 'Welcome Back'}
            {tab === 'signup' && 'Create Your Intelligence Profile'}
            {tab === 'admin' && 'Stark Admin Access'}
          </h2>
          <p style={{ margin: 0, color: '#8994ad', fontSize: '0.85rem' }}>
            {tab === 'signin' && 'Sign in to access your synchronized sessions.'}
            {tab === 'signup' && 'Set up your learning language and focus areas.'}
            {tab === 'admin' && 'Enter master administrative key for full system telemetry.'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
          background: 'rgba(255,255,255,0.03)',
          padding: 4,
          borderRadius: 10,
          marginBottom: 20
        }}>
          <button 
            type="button"
            onClick={() => { setTab('signin'); setErrorMsg(''); }}
            style={{
              background: tab === 'signin' ? 'rgba(110, 246, 247, 0.15)' : 'transparent',
              border: tab === 'signin' ? '1px solid rgba(110, 246, 247, 0.3)' : '1px solid transparent',
              color: tab === 'signin' ? '#6ef6f7' : '#8994ad',
              borderRadius: 8,
              padding: '7px 0',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setTab('signup'); setErrorMsg(''); }}
            style={{
              background: tab === 'signup' ? 'rgba(169, 150, 255, 0.15)' : 'transparent',
              border: tab === 'signup' ? '1px solid rgba(169, 150, 255, 0.3)' : '1px solid transparent',
              color: tab === 'signup' ? '#a996ff' : '#8994ad',
              borderRadius: 8,
              padding: '7px 0',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign Up
          </button>
          <button 
            type="button"
            onClick={() => { setTab('admin'); setErrorMsg(''); }}
            style={{
              background: tab === 'admin' ? 'rgba(255, 209, 101, 0.15)' : 'transparent',
              border: tab === 'admin' ? '1px solid rgba(255, 209, 101, 0.3)' : '1px solid transparent',
              color: tab === 'admin' ? '#ffd165' : '#8994ad',
              borderRadius: 8,
              padding: '7px 0',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Admin
          </button>
        </div>

        {errorMsg && (
          errorMsg.toLowerCase().includes('already registered') || errorMsg.toLowerCase().includes('already exists') ? (
            <div style={{
              background: 'rgba(255, 170, 0, 0.12)',
              border: '1px solid rgba(255, 170, 0, 0.4)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffaa00', fontWeight: 600, fontSize: '0.85rem' }}>
                <KeyRound size={15} /> Account Already Registered
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                {errorMsg}
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg('');
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255, 170, 0, 0.2)',
                  border: '1px solid rgba(255, 170, 0, 0.5)',
                  borderRadius: 6,
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2
                }}
              >
                Switch to Sign In <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 99, 132, 0.12)',
              border: '1px solid rgba(255, 99, 132, 0.3)',
              color: '#ff9db8',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.8rem',
              marginBottom: 16
            }}>
              {errorMsg}
            </div>
          )
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8994ad', marginBottom: 6, fontWeight: 500 }}>
                YOUR NAME / CODENAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#8994ad' }} />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Atul, Sarah..." 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {tab !== 'admin' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8994ad', marginBottom: 6, fontWeight: 500 }}>
                  EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#8994ad' }} />
                  <input 
                    type="email" 
                    required
                    placeholder="student@mit.edu" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#8994ad', marginBottom: 6, fontWeight: 500 }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#8994ad' }} />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#ffd165', marginBottom: 6, fontWeight: 500 }}>
                STARK MASTER ADMIN KEY
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} style={{ position: 'absolute', left: 12, top: 12, color: '#ffd165' }} />
                <input 
                  type="password" 
                  required
                  placeholder="Enter admin access key..." 
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(255, 209, 101, 0.05)',
                    border: '1px solid rgba(255, 209, 101, 0.25)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '12px',
              borderRadius: 8,
              background: tab === 'admin' 
                ? 'linear-gradient(135deg, #ffd165, #f59e0b)'
                : (tab === 'signup' ? 'linear-gradient(135deg, #a996ff, #6366f1)' : 'linear-gradient(135deg, #6ef6f7, #3b82f6)'),
              border: 'none',
              color: '#030508',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                {tab === 'signin' && 'Sign In'}
                {tab === 'signup' && 'Continue to Profile Survey'}
                {tab === 'admin' && 'Unlock Admin Protocol'}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Continue as Guest option */}
        <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button 
            type="button"
            onClick={continueAsGuest}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8994ad',
              fontSize: '0.82rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Compass size={13} /> Or continue as Guest Explorer (No account needed)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
