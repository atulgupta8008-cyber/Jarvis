import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Check, Globe, BookOpen, GraduationCap, Cpu, Layers, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  { id: 'High School', label: 'High School / JEE / AP', desc: 'Core fundamentals, competitive exams & intuitive proofs' },
  { id: 'Undergraduate', label: 'Undergraduate / College', desc: 'Rigorous multivariable calculus, classical mechanics & engineering' },
  { id: 'Graduate', label: 'Researcher / Graduate', desc: 'Advanced field theories, academic papers & cutting-edge derivations' },
  { id: 'Self-Learner', label: 'Curious Builder / Polymath', desc: 'First-principles mastery, systems thinking & real-world projects' }
];

const LEARNING_STYLES = [
  { id: 'Socratic', label: 'Socratic Inquiry (Recommended)', desc: 'Challenges you with guiding questions so you derive the concept yourself' },
  { id: 'Deep Derivations', label: 'Mathematical Proofs First', desc: 'Exhaustive step-by-step LaTeX calculus and algebraic derivations' },
  { id: 'Simulation-First', label: 'Visuals & 3D Simulations', desc: 'Dynamic Plotly 3D charts, phase-space models, and visual intuition' }
];

export default function OnboardingSurvey({ isOpen, onClose }) {
  const { profile, updateProfile, showSurveyModal, setShowSurveyModal } = useAuth();
  const activeIsOpen = isOpen !== undefined ? isOpen : showSurveyModal;
  const handleClose = onClose || (() => setShowSurveyModal(false));

  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState(profile.language || 'English');
  const [selectedSubjects, setSelectedSubjects] = useState(profile.interested_subjects || ['Physics', 'Mathematics', 'Astrophysics']);
  const [educationLevel, setEducationLevel] = useState(profile.education_level || 'Undergraduate');
  const [learningStyle, setLearningStyle] = useState(profile.learning_style || 'Socratic');

  React.useEffect(() => {
    setLanguage(profile.language || 'English');
    setSelectedSubjects(profile.interested_subjects || ['Physics', 'Mathematics', 'Astrophysics']);
    setEducationLevel(profile.education_level || 'Undergraduate');
    setLearningStyle(profile.learning_style || 'Socratic');
  }, [profile]);

  if (!activeIsOpen) return null;

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleFinish = async () => {
    try {
      await updateProfile({
        language,
        interested_subjects: selectedSubjects,
        education_level: educationLevel,
        learning_style: learningStyle
      });
    } catch (e) {
      console.error('Failed to update survey profile:', e);
    }
    handleClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ 
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 5, 8, 0.88)',
        backdropFilter: 'blur(20px)',
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
        zIndex: 100006,
        cursor: 'pointer'
      }}
    >
      <motion.div 
        className="survey-modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(8, 12, 24, 0.98)',
          border: '1px solid rgba(169, 150, 255, 0.25)',
          borderRadius: '24px',
          padding: '32px',
          color: '#f4f7ff',
          position: 'relative',
          boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 50px rgba(169, 150, 255, 0.12)',
          backdropFilter: 'blur(30px)',
          cursor: 'default'
        }}
      >
        <button 
          type="button"
          onClick={handleClose}
          title="Close Survey"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#f4f7ff',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            zIndex: 10
          }}
        >
          <X size={16} />
        </button>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map(idx => (
              <div 
                key={idx}
                style={{
                  width: 24,
                  height: 4,
                  borderRadius: 2,
                  background: idx <= step ? 'var(--cyan, #6ef6f7)' : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#8994ad', fontFamily: 'DM Mono, monospace' }}>
            STEP {step} OF 4
          </span>
        </div>

        {/* STEP 1: TEACHING LANGUAGE */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Globe size={20} color="var(--cyan, #6ef6f7)" />
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
                Choose Teaching Language
              </h2>
            </div>
            <p style={{ color: '#8994ad', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.5 }}>
              Select how you want Jarvis and the Socratic Professor to communicate during derivations and explanations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {/* English Option */}
              <div 
                onClick={() => setLanguage('English')}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: language === 'English' ? 'rgba(110, 246, 247, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: language === 'English' ? '1px solid #6ef6f7' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: language === 'English' ? '#6ef6f7' : '#fff' }}>English</span>
                  {language === 'English' && <Check size={16} color="#6ef6f7" />}
                </div>
                <p style={{ color: '#8994ad', fontSize: '0.76rem', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Formal academic and scientific English. Ideal for international university and research preparation.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, fontSize: '0.72rem', color: '#c8d0e0', fontStyle: 'italic' }}>
                  "Let us first inspect why energy conservation holds under time-translation symmetry..."
                </div>
              </div>

              {/* Hinglish Option */}
              <div 
                onClick={() => setLanguage('Hinglish')}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: language === 'Hinglish' ? 'rgba(169, 150, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: language === 'Hinglish' ? '1px solid #a996ff' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: language === 'Hinglish' ? '#a996ff' : '#fff' }}>Hinglish</span>
                  {language === 'Hinglish' && <Check size={16} color="#a996ff" />}
                </div>
                <p style={{ color: '#8994ad', fontSize: '0.76rem', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Conversational Hindi + English blend for deep intuitive grasp with standard LaTeX equations.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, fontSize: '0.72rem', color: '#c8d0e0', fontStyle: 'italic' }}>
                  "Pehle yeh visualize karo ki momentum conservation yahan fundamentally kyun hold karega..."
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: INTERESTED SUBJECTS */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <BookOpen size={20} color="var(--violet, #a996ff)" />
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
                Select Subjects of Interest
              </h2>
            </div>
            <p style={{ color: '#8994ad', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Choose your target areas. The Curiosity Feed and Professor Mode will tailor questions to these fields.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {AVAILABLE_SUBJECTS.map(subj => {
                const isSelected = selectedSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => toggleSubject(subj)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 20,
                      background: isSelected ? 'rgba(110, 246, 247, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: isSelected ? '1px solid rgba(110, 246, 247, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: isSelected ? '#6ef6f7' : '#c8d0e0',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSelected && <Check size={13} />} {subj}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 3: ACADEMIC LEVEL */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <GraduationCap size={20} color="var(--amber, #ffd165)" />
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
                Your Academic Level
              </h2>
            </div>
            <p style={{ color: '#8994ad', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Helps calibrate the mathematical depth, derivation rigor, and problem complexity.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {EDUCATION_LEVELS.map(lvl => {
                const isSelected = educationLevel === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setEducationLevel(lvl.id)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: isSelected ? 'rgba(255, 209, 101, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #ffd165' : '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? '#ffd165' : '#fff' }}>{lvl.label}</span>
                      {isSelected && <Check size={16} color="#ffd165" />}
                    </div>
                    <span style={{ color: '#8994ad', fontSize: '0.78rem' }}>{lvl.desc}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 4: LEARNING STYLE */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Cpu size={20} color="var(--rose, #ff9db8)" />
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
                AI Pedagogical Style
              </h2>
            </div>
            <p style={{ color: '#8994ad', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.5 }}>
              Choose the primary teaching strategy used across blackboard interactions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {LEARNING_STYLES.map(st => {
                const isSelected = learningStyle === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setLearningStyle(st.id)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: isSelected ? 'rgba(255, 157, 184, 0.12)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid #ff9db8' : '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? '#ff9db8' : '#fff' }}>{st.label}</span>
                      {isSelected && <Check size={16} color="#ff9db8" />}
                    </div>
                    <span style={{ color: '#8994ad', fontSize: '0.78rem' }}>{st.desc}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#c8d0e0',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              style={{
                background: 'linear-gradient(135deg, #6ef6f7, #3b82f6)',
                border: 'none',
                color: '#030508',
                padding: '9px 20px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              style={{
                background: 'linear-gradient(135deg, #34d399, #059669)',
                border: 'none',
                color: '#030508',
                padding: '10px 24px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 20px rgba(52, 211, 153, 0.3)'
              }}
            >
              Finish & Start Learning <Sparkles size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
