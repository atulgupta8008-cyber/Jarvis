import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    keys: { groq: '', openai: '', deepgram: '', gemini: '' },
    preferences: { active_brain: 'gemini', active_ears: 'vosk', active_voice: 'edge-tts' }
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(() => setStatus('Failed to load settings.'));
  }, []);

  const handleSave = () => {
    setStatus('Saving...');
    fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(() => {
      setStatus('Saved Successfully! Reboot system to apply core changes.');
      setTimeout(() => setStatus(''), 3000);
    })
    .catch(() => setStatus('Error saving settings.'));
  };

  const updateKey = (provider, value) => {
    setSettings(prev => ({
      ...prev,
      keys: { ...prev.keys, [provider]: value }
    }));
  };

  const updatePref = (pref, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [pref]: value }
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <h2 className="panel-title">System Configuration</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3 style={{ color: 'var(--ethereal-purple)', marginBottom: '15px' }}>API Keys</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '-8px' }}>
              Leave a key blank to keep the existing local value.
            </p>
            <div className="form-group">
              <label>Gemini API Key (Deep Think Core)</label>
              <input 
                type="password" 
                value={settings.keys.gemini} 
                onChange={e => updateKey('gemini', e.target.value)} 
                placeholder="AIzaSy..."
              />
            </div>
            <div className="form-group">
              <label>Groq API Key (Fast Core)</label>
              <input 
                type="password" 
                value={settings.keys.groq} 
                onChange={e => updateKey('groq', e.target.value)} 
                placeholder="gsk_..."
              />
            </div>
            <div className="form-group">
              <label>Deepgram API Key (Ears)</label>
              <input 
                type="password" 
                value={settings.keys.deepgram} 
                onChange={e => updateKey('deepgram', e.target.value)} 
              />
            </div>
          </div>
          
          <div>
            <h3 style={{ color: 'var(--neon-green)', marginBottom: '15px' }}>Preferences</h3>
            <div className="form-group">
              <label>Active Master Brain</label>
              <select 
                value={settings.preferences.active_brain} 
                onChange={e => updatePref('active_brain', e.target.value)}
              >
                <option value="gemini">Gemini 3.1 Flash Lite (Deep & Default)</option>
                <option value="groq">Llama 3 (Fast Core)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Voice Recognition</label>
              <select 
                value={settings.preferences.active_ears} 
                onChange={e => updatePref('active_ears', e.target.value)}
              >
                <option value="vosk">Vosk (Offline Wake Word)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Speech Synthesis</label>
              <select 
                value={settings.preferences.active_voice} 
                onChange={e => updatePref('active_voice', e.target.value)}
              >
                <option value="edge-tts">Edge TTS (Guy Neural)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="btn-primary" onClick={handleSave}>Save Configuration</button>
          {status && <p style={{ marginTop: '10px', color: 'var(--neon-yellow)' }}>{status}</p>}
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
