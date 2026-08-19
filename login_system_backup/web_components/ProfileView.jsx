import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Globe, BookOpen, GraduationCap, Cpu, 
  ArrowLeft, Check, LogOut, Sparkles, KeyRound, Compass, Save, AlertTriangle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ProfileView.css';

const AVAILABLE_SUBJECTS = [
  'Physics',
  'Astrophysics',
  'Mathematics',
  'Quantum Mechanics',
  'Relativity',
  'Computer Science',
  'Engineering',
  'Chemistry',
  'Biology',
  'Thermodynamics'
];

const EDUCATION_LEVELS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Self-Learner'
];

const LEARNING_STYLES = [
  'Socratic',
  'Deep Derivations',
  'Simulation-First'
];

export default function ProfileView({ onExit, onOpenAuth }) {
  const { user, profile, isGuest, isAdmin, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile.display_name || 'Scholar');
  const [language, setLanguage] = useState(profile.language || 'English');
  const [selectedSubjects, setSelectedSubjects] = useState(profile.interested_subjects || ['Physics', 'Mathematics', 'Astrophysics']);
  const [educationLevel, setEducationLevel] = useState(profile.education_level || 'Undergraduate');
  const [learningStyle, setLearningStyle] = useState(profile.learning_style || 'Socratic');
  const [savedToast, setSavedToast] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync inputs whenever active profile changes
  useEffect(() => {
    setDisplayName(profile.display_name || 'Scholar');
    setLanguage(profile.language || 'English');
    setSelectedSubjects(profile.interested_subjects || ['Physics', 'Mathematics', 'Astrophysics']);
    setEducationLevel(profile.education_level || 'Undergraduate');
    setLearningStyle(profile.learning_style || 'Socratic');
  }, [profile]);

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleSave = async () => {
    await updateProfile({
      display_name: displayName,
      language,
      interested_subjects: selectedSubjects,
      education_level: educationLevel,
      learning_style: learningStyle
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
  };

  return (
    <div className="profile-page-container">
      <div className="profile-bg-glow" />

      {/* Navigation Header */}
      <header className="profile-nav">
        <button className="profile-nav-back" onClick={onExit}>
          <ArrowLeft size={14} /> Back to Nexus
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isGuest ? (
            <button 
              onClick={onOpenAuth}
              style={{
                background: 'linear-gradient(135deg, #a996ff, #6366f1)',
                border: 'none',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <User size={13} /> Sign In / Create Account
            </button>
          ) : (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                background: 'rgba(255, 99, 132, 0.1)',
                border: '1px solid rgba(255, 99, 132, 0.25)',
                color: '#ff9db8',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="profile-content-wrapper">
        
        {/* User Identity Card */}
        <section className="profile-hero-card">
          <div className="profile-avatar-block">
            <div 
              className="profile-avatar-hex"
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #ffd165, #f59e0b)' 
                  : (isGuest ? 'linear-gradient(135deg, #a996ff, #6366f1)' : 'linear-gradient(135deg, #6ef6f7, #3b82f6)')
              }}
            >
              {isAdmin ? <Shield size={32} /> : (displayName ? displayName.charAt(0).toUpperCase() : 'S')}
            </div>
            <div className="profile-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1>{displayName}</h1>
                <span 
                  className="profile-badge"
                  style={{
                    background: isAdmin 
                      ? 'rgba(255, 209, 101, 0.15)' 
                      : (isGuest ? 'rgba(169, 150, 255, 0.15)' : 'rgba(52, 211, 153, 0.15)'),
                    color: isAdmin ? '#ffd165' : (isGuest ? '#a996ff' : '#34d399'),
                    border: `1px solid ${isAdmin ? 'rgba(255,209,101,0.3)' : (isGuest ? 'rgba(169,150,255,0.3)' : 'rgba(52,211,153,0.3)')}`
                  }}
                >
                  {isAdmin ? 'Stark Admin' : (isGuest ? 'Guest Explorer' : 'Verified Scholar')}
                </span>
              </div>
              <p style={{ margin: 0, color: '#8994ad', fontSize: '0.85rem' }}>
                {user?.email || (isGuest ? 'Local browser session (Zero database usage)' : 'Synchronized Cloud Profile')}
              </p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #6ef6f7, #3b82f6)',
              border: 'none',
              color: '#030508',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 0 20px rgba(110, 246, 247, 0.25)'
            }}
          >
            <Save size={15} /> Save & Apply
          </button>
        </section>

        {savedToast && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              color: '#34d399',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Check size={16} /> Preferences successfully updated and applied across all modes!
          </motion.div>
        )}

        {/* Display Name Input */}
        <section className="profile-section-card">
          <div className="profile-section-header">
            <User size={18} color="var(--cyan, #6ef6f7)" /> Display Name & Identity
          </div>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or codename..."
            style={{
              maxWidth: '360px',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              fontSize: '0.9rem'
            }}
          />
        </section>

        {/* Teaching Language */}
        <section className="profile-section-card">
          <div className="profile-section-header">
            <Globe size={18} color="var(--cyan, #6ef6f7)" /> Teaching & Explanation Language
          </div>
          <div className="profile-grid-2col">
            <div 
              onClick={() => setLanguage('English')}
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: language === 'English' ? 'rgba(110, 246, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                border: language === 'English' ? '1px solid #6ef6f7' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ color: language === 'English' ? '#6ef6f7' : '#fff' }}>English Mode</strong>
                {language === 'English' && <Check size={16} color="#6ef6f7" />}
              </div>
              <p style={{ margin: 0, color: '#8994ad', fontSize: '0.78rem', lineHeight: 1.4 }}>
                Formal, rigorous international MIT standard English for all derivations and questions.
              </p>
            </div>

            <div 
              onClick={() => setLanguage('Hinglish')}
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: language === 'Hinglish' ? 'rgba(169, 150, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                border: language === 'Hinglish' ? '1px solid #a996ff' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ color: language === 'Hinglish' ? '#a996ff' : '#fff' }}>Hinglish Mode</strong>
                {language === 'Hinglish' && <Check size={16} color="#a996ff" />}
              </div>
              <p style={{ margin: 0, color: '#8994ad', fontSize: '0.78rem', lineHeight: 1.4 }}>
                Natural bilingual Hindi + English conversational explanations with standard LaTeX math.
              </p>
            </div>
          </div>
        </section>

        {/* Interested Subjects */}
        <section className="profile-section-card">
          <div className="profile-section-header">
            <BookOpen size={18} color="var(--violet, #a996ff)" /> Target Subject Focus (For Curiosity Feed & Socratic Directives)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {AVAILABLE_SUBJECTS.map(subj => {
              const isSelected = selectedSubjects.includes(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => toggleSubject(subj)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: isSelected ? 'rgba(110, 246, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(110, 246, 247, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: isSelected ? '#6ef6f7' : '#c8d0e0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isSelected && <Check size={13} />} {subj}
                </button>
              );
            })}
          </div>
        </section>

        {/* Education Level & Learning Style */}
        <div className="profile-grid-2col">
          <section className="profile-section-card">
            <div className="profile-section-header">
              <GraduationCap size={18} color="var(--amber, #ffd165)" /> Academic Level
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EDUCATION_LEVELS.map(lvl => (
                <div 
                  key={lvl}
                  onClick={() => setEducationLevel(lvl)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: educationLevel === lvl ? 'rgba(255, 209, 101, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: educationLevel === lvl ? '1px solid #ffd165' : '1px solid rgba(255,255,255,0.06)',
                    color: educationLevel === lvl ? '#ffd165' : '#c8d0e0',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {lvl} {educationLevel === lvl && <Check size={14} />}
                </div>
              ))}
            </div>
          </section>

          <section className="profile-section-card">
            <div className="profile-section-header">
              <Cpu size={18} color="var(--rose, #ff9db8)" /> Teaching Strategy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LEARNING_STYLES.map(style => (
                <div 
                  key={style}
                  onClick={() => setLearningStyle(style)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: learningStyle === style ? 'rgba(255, 157, 184, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: learningStyle === style ? '1px solid #ff9db8' : '1px solid rgba(255,255,255,0.06)',
                    color: learningStyle === style ? '#ff9db8' : '#c8d0e0',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {style} {learningStyle === style && <Check size={14} />}
                </div>
              ))}
            </div>
          </section>
        </div>

      </main>

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="modal-overlay" style={{ zIndex: 100000 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              style={{
                width: '100%',
                maxWidth: '400px',
                background: 'rgba(8, 12, 22, 0.96)',
                border: '1px solid rgba(255, 99, 132, 0.3)',
                borderRadius: '16px',
                padding: '28px',
                color: '#fff',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(255, 99, 132, 0.15)',
                backdropFilter: 'blur(20px)',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 99, 132, 0.12)',
                border: '1px solid rgba(255, 99, 132, 0.3)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                color: '#ff9db8'
              }}>
                <LogOut size={22} />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontFamily: 'Syne, sans-serif' }}>
                Confirm Sign Out
              </h3>
              <p style={{ margin: '0 0 24px', color: '#8994ad', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Are you sure you want to sign out? Your learning profile and chat sessions are safely preserved in your account.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#c8d0e0',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignOut}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #ff6384, #e11d48)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(255, 99, 132, 0.3)'
                  }}
                >
                  Yes, Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
