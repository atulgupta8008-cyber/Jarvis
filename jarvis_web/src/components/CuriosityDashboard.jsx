import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Compass, Zap, Flame, HelpCircle } from 'lucide-react';

const FALLBACK_HOOKS = [
  { question: "A teaspoon of neutron star weighs 6 billion tons. But why doesn't it collapse into a black hole?", category: "Astrophysics", difficulty: 2, hook_type: "paradox" },
  { question: "You learned F=ma in school. What if I told you Newton's version is technically wrong?", category: "Physics", difficulty: 2, hook_type: "mindblown" },
  { question: "Can you design a bridge that uses ONLY tension — no compression allowed?", category: "Engineering", difficulty: 3, hook_type: "challenge" },
  { question: "What if Earth suddenly had two Suns? Would we even survive the first week?", category: "Astrophysics", difficulty: 1, hook_type: "whatif" },
  { question: "Why does hot water freeze faster than cold water? Even scientists can't fully agree.", category: "Thermodynamics", difficulty: 2, hook_type: "paradox" },
  { question: "If you fell into a black hole, you'd see the entire future of the universe flash before your eyes. Why?", category: "Relativity", difficulty: 3, hook_type: "mindblown" },
  { question: "Can you calculate how much energy is stored in a single raisin using E=mc²?", category: "Nuclear Physics", difficulty: 1, hook_type: "challenge" },
  { question: "What if gravity suddenly became 10x stronger right now? How long would buildings last?", category: "Physics", difficulty: 2, hook_type: "whatif" },
  { question: "Why can you never actually touch anything? Quantum mechanics says it's impossible.", category: "Quantum Physics", difficulty: 1, hook_type: "paradox" },
  { question: "What happens if you travel at the speed of light and turn on a flashlight?", category: "Relativity", difficulty: 2, hook_type: "whatif" }
];

export default function CuriosityDashboard({ hooks = [], onClose, onLaunchCuriosity, onSelectHook }) {
  const activeHooks = (hooks && hooks.length > 0) ? hooks : FALLBACK_HOOKS;
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(activeHooks.map(h => h.category || 'General')))];

  const filteredHooks = selectedCategory === 'All'
    ? activeHooks
    : activeHooks.filter(h => h.category === selectedCategory);

  const handleSelect = (question) => {
    if (onLaunchCuriosity) {
      onLaunchCuriosity(question);
    } else if (onSelectHook) {
      onSelectHook(question);
    }
  };

  const getHookTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'paradox': return 'var(--rose, #ff9db8)';
      case 'mindblown': return 'var(--violet, #a996ff)';
      case 'challenge': return 'var(--amber, #ffd165)';
      case 'whatif': return 'var(--cyan, #6ef6f7)';
      default: return 'var(--cyan, #6ef6f7)';
    }
  };

  const getHookTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'paradox': return <Flame size={12} />;
      case 'mindblown': return <Sparkles size={12} />;
      case 'challenge': return <Zap size={12} />;
      case 'whatif': return <HelpCircle size={12} />;
      default: return <Compass size={12} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(3, 5, 8, 0.96)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        color: '#f4f7ff',
        fontFamily: 'Space Grotesk, sans-serif'
      }}
    >
      {/* Top Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(3, 5, 8, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '20px clamp(20px, 4vw, 48px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(110, 246, 247, 0.2), rgba(169, 150, 255, 0.2))',
            border: '1px solid rgba(110, 246, 247, 0.3)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--cyan, #6ef6f7)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              color: 'var(--cyan, #6ef6f7)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}>
              First Principles Engine
            </div>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '1.4rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Curiosity Feed & Paradox Matrix
            </h1>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'grid',
            placeItems: 'center',
            color: '#c8d0e0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#c8d0e0';
          }}
        >
          <X size={18} />
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '32px clamp(20px, 4vw, 48px) 64px',
        boxSizing: 'border-box'
      }}>
        {/* Category Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '32px'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '11px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: selectedCategory === cat
                  ? '1px solid var(--cyan, #6ef6f7)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedCategory === cat
                  ? 'rgba(110, 246, 247, 0.12)'
                  : 'rgba(255, 255, 255, 0.02)',
                color: selectedCategory === cat ? 'var(--cyan, #6ef6f7)' : '#8994ad',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: selectedCategory === cat ? 700 : 500
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          <AnimatePresence>
            {filteredHooks.map((hook, idx) => {
              const typeColor = getHookTypeColor(hook.hook_type);
              const icon = getHookTypeIcon(hook.hook_type);

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleSelect(hook.question)}
                  style={{
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '200px',
                    overflow: 'hidden',
                    transition: 'border-color 0.25s, box-shadow 0.25s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = typeColor;
                    e.currentTarget.style.boxShadow = `0 10px 30px -10px ${typeColor}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Colored top accent bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, ${typeColor}, transparent)`
                  }} />

                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${typeColor}44`,
                        color: typeColor,
                        background: `${typeColor}11`
                      }}>
                        {icon} {hook.hook_type?.toUpperCase() || 'QUESTION'}
                      </span>

                      {/* Difficulty Level */}
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1, 2, 3].map((lvl) => (
                          <span
                            key={lvl}
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: lvl <= (hook.difficulty || 1)
                                ? typeColor
                                : 'rgba(255, 255, 255, 0.15)'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '11px',
                      color: 'var(--cyan, #6ef6f7)',
                      marginBottom: '8px'
                    }}>
                      {hook.category}
                    </div>

                    <p style={{
                      fontSize: '0.96rem',
                      lineHeight: 1.55,
                      color: '#f4f7ff',
                      fontWeight: 500,
                      margin: '0 0 20px 0'
                    }}>
                      "{hook.question}"
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                    color: typeColor,
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span>Investigate with Professor</span>
                    <ArrowRight size={13} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}
