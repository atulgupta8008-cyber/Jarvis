import React, { useState, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowDownRight, ArrowRight, Bot, BrainCircuit, Compass,
  Cpu, Mic, Orbit, ShieldCheck, Sparkles, Users, Menu, X,
  Layers, Zap, BookOpen, FlaskConical, HelpCircle, Flame, MessageSquare
} from 'lucide-react';
import OrbitalCore from './OrbitalCore';
import './NexusLanding.css';

const FALLBACK_CURIOSITY_HOOKS = [
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

function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0, x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0 },
    visible: { opacity: 1, y: 0, x: 0 }
  };
  return (
    <motion.div ref={ref} className={className}
      variants={variants} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >{children}</motion.div>
  );
}

function StaggerWords({ text, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(' ');
  return (
    <motion.span ref={ref} className={className} style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="hero-word"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </motion.span>
  );
}

const modes = [
  { num: '01', title: 'Professor', tag: 'Socratic learning', desc: 'A Socratic AI tutor that guides you through physics, math, and engineering — asking the right questions so you truly understand, not just memorize.', icon: BrainCircuit, mode: 'professor', color: 'cyan' },
  { num: '02', title: 'Architect', tag: 'Systems thinking', desc: 'Map the moving parts of any problem. Teach an AI student your topic and get scored on clarity — the fastest way to find gaps in your understanding.', icon: Compass, mode: 'architect', color: 'violet' },
  { num: '03', title: 'Jarvis', tag: 'Voice AI workspace', desc: 'Your personal AI assistant with voice commands, real-time telemetry, and a command-line interface — the central intelligence hub.', icon: Bot, mode: 'assistant', color: 'emerald' },
  { num: '04', title: 'Study Group', tag: 'Collaborative debate', desc: 'Two AI agents — a skeptic and an advocate — debate your ideas from opposing sides, sharpening your thinking through structured discussion.', icon: Users, mode: 'study-group', color: 'rose' },
];

const capabilities = [
  { title: 'Fractal Derivations', detail: 'Click any variable in an equation to expand it infinitely — each layer goes deeper into fundamental physics.', icon: Layers },
  { title: 'Deep Research Protocol', detail: 'Multi-agent swarm research synthesizes information from multiple angles before delivering a comprehensive answer.', icon: Zap },
  { title: 'Time Machine Mode', detail: 'Travel to the moment of discovery. Experience science as it was first found — derive the laws yourself from raw data.', icon: BookOpen },
  { title: 'Live Simulations', detail: 'Interactive Plotly simulations render directly on the blackboard. Visualize physics concepts in real-time.', icon: FlaskConical },
  { title: 'Voice Commands', detail: 'Speak naturally to set context, ask questions, and navigate between modes — powered by an offline wake word engine.', icon: Mic },
];

const stats = [
  { value: '4', label: 'THINKING MODES' },
  { value: '∞', label: 'DERIVATION DEPTH' },
  { value: 'LIVE', label: 'SIMULATIONS' },
  { value: 'VOICE', label: 'NATIVE COMMANDS' },
];

export default function NexusLanding({ onLaunchMode, curiosityHooks = [], onLaunchCuriosity, onOpenCuriosityDashboard, onOpenFeedback }) {
  const [scroll, setScroll] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const allHooks = (curiosityHooks && curiosityHooks.length > 0) ? curiosityHooks : FALLBACK_CURIOSITY_HOOKS;

  const categories = ['All', 'Astrophysics', 'Physics', 'Relativity', 'Quantum Physics', 'Engineering', 'Thermodynamics'];
  
  const filteredHooks = selectedCategory === 'All' 
    ? allHooks 
    : allHooks.filter(h => h.category?.toLowerCase() === selectedCategory.toLowerCase());

  const onScroll = useCallback((e) => {
    const t = e.target;
    setScroll(t.scrollTop / Math.max(t.scrollHeight - t.clientHeight, 1));
  }, []);

  const jump = (id) => { 
    setMobileMenu(false); 
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); 
  };
  
  const go = (mode) => { 
    setMobileMenu(false); 
    onLaunchMode?.(mode); 
  };

  const getHookTypeColor = (type) => {
    switch (type) {
      case 'paradox': return 'var(--rose)';
      case 'mindblown': return 'var(--violet)';
      case 'challenge': return 'var(--amber)';
      case 'whatif': return 'var(--cyan)';
      default: return 'var(--cyan)';
    }
  };

  return (
    <div className="nexus-landing" onScroll={onScroll}>
      <div className="nexus-noise" />
      <div className="nexus-progress" style={{ transform: `scaleX(${scroll})` }} />
      
      {/* === NAVIGATION === */}
      <nav className="nexus-nav">
        <div className="nav-logo" onClick={() => jump('top')} style={{ cursor: 'pointer' }}>
          <span className="logo-hex"><Sparkles size={14} /></span>
          NOVANETS<span style={{ color: 'var(--cyan)' }}>//</span>OS
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => jump('mission')}>Mission</button>
          <button className="nav-link" onClick={() => jump('modes')}>Modes</button>
          <button className="nav-link" onClick={() => jump('curiosity')}>Curiosity Feed</button>
          <button className="nav-link" onClick={() => jump('core')}>Core</button>
          <button className="nav-link" onClick={onOpenFeedback} style={{ color: 'var(--cyan, #6ef6f7)' }}>Feedback</button>
        </div>
        <div className="nav-right">
          <button className="btn-launch" onClick={() => go('professor')}>Open Jarvis <ArrowRight size={14} /></button>
          <button className="mobile-menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Menu"><Menu size={22} /></button>
        </div>
      </nav>

      {/* === MOBILE MENU === */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="mobile-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close"><X size={24} /></button>
            {['Mission', 'Modes', 'Curiosity', 'Core'].map((label, i) => (
              <motion.button key={label} className="mob-link"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                onClick={() => jump(label.toLowerCase().replace(' ', '-'))}
              >{label}</motion.button>
            ))}
            <motion.button className="mob-link"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => { setMobileMenu(false); onOpenFeedback?.(); }}
              style={{ color: 'var(--cyan, #6ef6f7)' }}
            >
              Feedback & Signals
            </motion.button>
            <motion.button className="btn-launch" style={{ marginTop: 16 }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              onClick={() => go('professor')}
            >Open Jarvis <ArrowRight size={14} /></motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* === HERO === */}
        <section className="nexus-hero" id="top">
          <div className="hero-copy">
            <motion.div className="hero-kicker"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >Personal intelligence, made actionable</motion.div>

            <h1 className="hero-h1">
              <StaggerWords text="THINK" />
              <span className="accent-cyan"><StaggerWords text="DEEPER." /></span>
              <br />
              <StaggerWords text="BUILD" />
              <i className="accent-serif"><StaggerWords text="further." /></i>
            </h1>

            <motion.p className="hero-desc"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >Jarvis is a personal AI workspace for deeper understanding. Ask better questions, run live simulations, derive equations from scratch, and leave every session smarter than you started.</motion.p>

            <motion.div className="hero-actions"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
            >
              <button className="btn-launch" onClick={() => go('professor')}>Start a conversation <ArrowRight size={14} /></button>
              <button className="btn-secondary" onClick={() => jump('curiosity')}>Explore Curiosity Feed <ArrowDownRight size={14} /></button>
            </motion.div>

            <motion.div className="signal-bar"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <span className="signal-dot" />
              System online · Voice, reasoning & creation in one interface
            </motion.div>

            {/* Always visible discovery prompt chips */}
            <motion.div 
              className="curiosity-chips"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              {allHooks.slice(0, 3).map((h, i) => (
                <button 
                  key={i} 
                  className="curiosity-chip" 
                  onClick={() => onLaunchCuriosity?.(h.question)}
                  title="Launch Socratic Investigation"
                >
                  <Sparkles size={12} /> {h.question}
                </button>
              ))}
            </motion.div>
          </div>

          <motion.div className="hero-visual"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="orbital-canvas">
              <OrbitalCore />
            </div>
            <div className="orbital-label label-top">JARVIS//CORE <span>ACTIVE</span></div>
            <div className="orbital-label label-bottom"><strong>COGNITION 01.00</strong><em>STABLE</em></div>
          </motion.div>

          <div className="scroll-hint">SCROLL TO EXPLORE <span className="scroll-line" /></div>
        </section>

        {/* === STATS STRIP === */}
        <div className="stats-strip">
          {stats.map((s, i) => (
            <Reveal key={i} className="stat-item" delay={i * 0.08}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>

        {/* === MANIFESTO === */}
        <section className="manifesto-section" id="mission">
          <div className="manifesto-bg" style={{ backgroundImage: "url('/nexus/astronaut-frames/ezgif-frame-120.jpg')" }} />
          <div className="manifesto-overlay" />
          <div className="manifesto-grid">
            <Reveal>
              <span className="section-tag">Why Jarvis</span>
              <h2 className="manifesto-h2">THE BEST WORK<br />STARTS WITH A<br /><span>BETTER QUESTION.</span></h2>
            </Reveal>
            <Reveal className="manifesto-copy" delay={0.12}>
              <p>Jarvis is not another tab that produces a wall of text. It is a responsive thinking environment — one place to clarify a goal, interrogate an idea, build a plan, and leave with real understanding.</p>
              <p>Traditional search gives you results. Jarvis gives you comprehension. It challenges your assumptions, maps complex systems, and simulates the real world — ensuring you master the subject.</p>
              <button className="text-link" onClick={() => jump('modes')}>Explore all modes <ArrowRight size={14} /></button>
            </Reveal>
          </div>
        </section>

        {/* === MODES === */}
        <section className="modes-section" id="modes">
          <Reveal>
            <span className="section-tag">Choose your focus</span>
            <h2 className="modes-heading">AN INTERFACE FOR<br /><span>EVERY KIND OF THINKING.</span></h2>
          </Reveal>
          <div className="mode-grid">
            {modes.map((m, i) => (
              <Reveal key={m.mode} delay={i * 0.08} className={`mode-card mode-${m.color}`}>
                <div className="mode-inner" onClick={() => go(m.mode)}>
                  <div className="mode-top">
                    <span className="mode-num">{m.num} / MODE</span>
                    <m.icon size={22} />
                  </div>
                  <p className="mode-eyebrow">{m.tag}</p>
                  <h3 className="mode-title">{m.title}</h3>
                  <p className="mode-desc">{m.desc}</p>
                  <div className="mode-enter">Enter mode <ArrowRight size={14} /></div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* === DEDICATED CURIOSITY SHOWCASE SECTION === */}
        <section className="curiosity-section" id="curiosity">
          <div className="curiosity-container">
            <Reveal>
              <span className="section-tag">◆ Daily Curiosity Engine</span>
              <h2 className="curiosity-heading">
                THE UNIVERSE IS FULL OF PARADOXES.<br />
                <span>CHOOSE ONE TO UNRAVEL.</span>
              </h2>
              <p className="curiosity-subtext">
                Every hook below is a portal into deep physics, engineering, and cosmology. Click any card to launch an instant Socratic investigation with Jarvis.
              </p>
            </Reveal>

            {/* Category Filter Tabs */}
            <div className="curiosity-filter-bar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`curiosity-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Curiosity Cards Grid */}
            <div className="curiosity-cards-grid">
              {filteredHooks.map((hook, idx) => {
                const typeColor = getHookTypeColor(hook.hook_type);
                return (
                  <Reveal key={idx} delay={idx * 0.05} className="curiosity-card">
                    <div 
                      className="curiosity-card-inner" 
                      onClick={() => onLaunchCuriosity?.(hook.question)}
                    >
                      <div className="curiosity-card-top">
                        <span className="curiosity-type-badge" style={{ borderColor: typeColor, color: typeColor }}>
                          {hook.hook_type?.toUpperCase() || 'INSIGHT'}
                        </span>
                        <div className="curiosity-difficulty">
                          {[1, 2, 3].map((lvl) => (
                            <span 
                              key={lvl} 
                              className={`diff-dot ${lvl <= (hook.difficulty || 1) ? 'filled' : ''}`} 
                            />
                          ))}
                        </div>
                      </div>

                      <div className="curiosity-category-tag">{hook.category}</div>

                      <p className="curiosity-card-question">
                        "{hook.question}"
                      </p>

                      <div className="curiosity-card-action">
                        <span>Investigate with Jarvis</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            {/* Action Bar to open full curiosity dashboard */}
            {onOpenCuriosityDashboard && (
              <div className="curiosity-bottom-bar">
                <button 
                  className="btn-secondary" 
                  onClick={onOpenCuriosityDashboard}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Sparkles size={16} color="var(--violet)" />
                  Open Fullscreen Curiosity Matrix
                </button>
              </div>
            )}
          </div>
        </section>

        {/* === CORE CAPABILITIES === */}
        <section className="core-section" id="core">
          <div className="core-grid">
            <Reveal className="core-intro">
              <span className="section-tag">Jarvis intelligence layer</span>
              <h2 className="core-heading">YOUR INTENT,<br /><span>AMPLIFIED.</span></h2>
              <p className="core-desc">Behind the interface is a powerful set of capabilities designed to turn natural language into robust workflows, deep research, and real-time computation.</p>
              <button className="btn-launch" onClick={() => go('architect')}>Plan with Architect <ArrowRight size={14} /></button>

              <div className="console-card">
                <div className="console-bar">
                  <span><Cpu size={12} /> JARVIS // SESSION PREVIEW</span>
                  <span className="console-live"><span className="signal-dot" style={{ width: 5, height: 5 }} /> READY</span>
                </div>
                <div className="console-body">
                  <p className="console-user">Help me understand quantum entanglement using a classical analogy first.</p>
                  <p className="console-ai"><b>JARVIS</b> — Imagine a pair of magical coins. No matter how far apart, when you flip one and get heads, the other instantly shows heads too. That's the intuition. Now let's break down why classical correlation can't fully explain this...</p>
                  <div className="console-actions">
                    <button className="console-action" onClick={() => go('professor')}>Open Professor</button>
                    <button className="console-action" onClick={() => go('architect')}>Map the concept</button>
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="cap-list">
              {capabilities.map((c, i) => (
                <Reveal key={i} className="cap-card" delay={0.08 + i * 0.06}>
                  <div className="cap-icon"><c.icon size={18} /></div>
                  <div><h3 className="cap-title">{c.title}</h3><p className="cap-detail">{c.detail}</p></div>
                  <span className="cap-idx">0{i + 1}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* === CTA === */}
        <section className="cta-section">
          <Reveal className="cta-inner">
            <Orbit size={28} style={{ color: 'var(--cyan)', marginBottom: 12 }} />
            <p className="cta-tag">JARVIS IS READY</p>
            <h2 className="cta-heading">BRING THE QUESTION.<br /><span>LEAVE WITH MOMENTUM.</span></h2>
            <button className="btn-launch cta-btn" onClick={() => go('professor')}>Launch Jarvis <ArrowRight size={14} /></button>
          </Reveal>
        </section>
      </main>

      {/* === FOOTER === */}
      <footer className="nexus-footer">
        <div className="footer-left">
          <div className="nav-logo" style={{ opacity: 0.5, fontSize: 11 }}>
            <span className="logo-hex" style={{ width: 20, height: 20, filter: 'grayscale(0.5)' }}><Sparkles size={10} /></span>
            NOVANETS//OS
          </div>
          <span>Personal intelligence for purposeful work.</span>
        </div>
        <div className="footer-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={onOpenFeedback}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--cyan, #6ef6f7)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              padding: 0
            }}
          >
            <MessageSquare size={13} /> Share Feedback
          </button>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={13} /> 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
