import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useInView, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import {
  ArrowDownRight, ArrowRight, Bot, BrainCircuit, Compass,
  Cpu, Mic, Orbit, Shield, ShieldCheck, Sparkles, Users, Menu, X,
  Layers, Zap, BookOpen, FlaskConical, HelpCircle, Flame, MessageSquare,
  Trophy, RotateCcw, CheckCircle2, Award
} from 'lucide-react';
import OrbitalCore from './OrbitalCore';
import './NexusLanding.css';

const EVERYDAY_MYSTERIES = [
  {
    id: "mpemba",
    question: "Why does boiling hot water freeze faster in the freezer than cold water?",
    category: "Everyday Mysteries",
    difficulty: 1,
    hook_type: "paradox",
    options: ["Hot water evaporates & convects faster", "Cold water has more dissolved gas"],
    answer_idx: 0,
    teaser: "It is called the Mpemba Effect! Rapid convection currents, micro-evaporation, and hydrogen bond stretching allow warm water to outpace cold water in certain cooling regimes."
  },
  {
    id: "mirrors",
    question: "Why do mirrors flip your reflection left-to-right, but NEVER upside-down?",
    category: "Everyday Mysteries",
    difficulty: 1,
    hook_type: "mindblown",
    options: ["Mirrors flip front-to-back, not sideways", "Gravity aligns our optic nerves"],
    answer_idx: 0,
    teaser: "Mirrors don't actually flip left and right at all—they invert front to back (Z-axis)! Your brain mentally rotates yourself 180 degrees to match it, creating the illusion."
  },
  {
    id: "coffee",
    question: "Why does coffee wake you up if it actually provides zero physical calories?",
    category: "Everyday Mysteries",
    difficulty: 1,
    hook_type: "mindblown",
    options: ["Caffeine blocks your brain's sleepiness receptors", "It speeds up red blood cell flow"],
    answer_idx: 0,
    teaser: "Caffeine is an impostor molecule! It slots directly into your brain's adenosine receptors, preventing fatigue chemicals from telling your body that it is tired."
  },
  {
    id: "spicy",
    question: "Why does chili feel burning hot even when you eat it ice-cold from the fridge?",
    category: "Everyday Mysteries",
    difficulty: 1,
    hook_type: "paradox",
    options: ["Capsaicin tricks your physical heat receptors", "Chilis generate chemical heat"],
    answer_idx: 0,
    teaser: "Capsaicin chemically binds to the TRPV1 receptor on your tongue—the exact same biological sensor that warns your brain when you are touching a 43°C+ flame!"
  },
  {
    id: "birds",
    question: "Why don't birds get electrocuted when perched on bare 10,000-volt power lines?",
    category: "Nature Superpowers",
    difficulty: 1,
    hook_type: "mindblown",
    options: ["Both feet share the exact same electrical potential", "Bird feet have thick rubber-like skin"],
    answer_idx: 0,
    teaser: "Electricity requires a voltage drop between two points to flow. Since both feet touch the exact same wire, zero current travels through the bird's body!"
  },
  {
    id: "cats",
    question: "Why can cats survive high-rise falls from 30 floors up better than from 7 floors?",
    category: "Nature Superpowers",
    difficulty: 2,
    hook_type: "paradox",
    options: ["They reach terminal velocity and relax like skydivers", "Wind currents lift them up"],
    answer_idx: 0,
    teaser: "After ~7 stories, a cat hits terminal velocity (~60 mph), their vestibular system stabilizes, and they spread out like a parachute to distribute the shock safely!"
  },
  {
    id: "headphones",
    question: "How do noise-canceling headphones erase loud jet engines by playing MORE sound?",
    category: "Pocket Magic",
    difficulty: 2,
    hook_type: "mindblown",
    options: ["Destructive interference cancels sound waves to zero", "Acoustic foam blocks air completely"],
    answer_idx: 0,
    teaser: "Microphones listen to incoming engine sound waves and instantly synthesize an inverted 'anti-wave'. The wave crests meet troughs, mathematically canceling sound to zero!"
  },
  {
    id: "airplane",
    question: "Why does every passenger airplane window have a tiny mystery hole at the bottom?",
    category: "Pocket Magic",
    difficulty: 1,
    hook_type: "mindblown",
    options: ["It balances air pressure between outer and inner panes", "It supplies emergency air cabin flow"],
    answer_idx: 0,
    teaser: "Called a 'bleed hole', it regulates the pressure difference between the pressurized cabin and the freezing -50°C thin air at 35,000 feet, keeping the outer pane safe!"
  },
  {
    id: "touch",
    question: "Why can you never actually 'touch' anything in the universe, including your phone?",
    category: "Mind & Body",
    difficulty: 2,
    hook_type: "paradox",
    options: ["Negative electrons repel each other before contact", "Air molecules create an unbreakable cushion"],
    answer_idx: 0,
    teaser: "Electron shells in your fingertip atoms and the screen's atoms repel each other via the electromagnetic force. You never touch matter; you only ever feel electrostatic repulsion!"
  },
  {
    id: "paper",
    question: "Why would folding an ordinary piece of printer paper 42 times reach the Moon?",
    category: "Cosmic What-Ifs",
    difficulty: 1,
    hook_type: "mindblown",
    options: ["Exponential doubling (2^42) creates cosmic thickness", "Paper fibers stretch infinitely in vacuum"],
    answer_idx: 0,
    teaser: "Exponential math! Doubling 0.1 mm paper 42 times equals 2^42 × 0.1mm ≈ 439,800 kilometers—surpassing the Moon's 384,400 km orbit easily!"
  }
];

function Reveal({ children, className = '', delay = 0, direction = 'up', scale, rotate, blur }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const variants = {
    hidden: { 
      opacity: 0, 
      y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0, 
      x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0,
      scale: scale ? 0.9 : 1,
      rotate: rotate ? 5 : 0,
      filter: blur ? 'blur(8px)' : 'blur(0px)'
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      x: 0,
      scale: 1,
      rotate: 0,
      filter: 'blur(0px)'
    }
  };
  return (
    <motion.div ref={ref} className={className + (blur ? ' blur-reveal' : '')}
      variants={variants} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ type: 'spring', damping: 25, stiffness: 120, delay }}
    >{children}</motion.div>
  );
}

function CountUp({ to, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    let animationFrame;
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * to));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay * 1000);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animationFrame);
    };
  }, [inView, to, delay]);

  return <span ref={ref}>{count}</span>;
}

function StatValue({ value, delay }) {
  const isNumeric = !isNaN(value);
  if (isNumeric) {
    return <CountUp to={parseInt(value, 10)} delay={delay} />;
  }
  return <span>{value}</span>;
}

function LineWipe() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  return (
    <motion.div 
      ref={ref}
      className="scroll-line-wipe" 
      initial={{ scaleX: 0 }} 
      animate={inView ? { scaleX: 1 } : { scaleX: 0 }} 
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  );
}

function ModeCard({ m, i, go }) {
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);
  
  const rotateXSpring = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Reveal delay={i * 0.08} className={`mode-card mode-${m.color}`}>
      <motion.div 
        ref={cardRef}
        className="mode-inner" 
        onClick={() => go(m.mode)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX: rotateXSpring, rotateY: rotateYSpring, transformStyle: "preserve-3d" }}
      >
        <div className="mode-top">
          <span className="mode-num">{m.num} / MODE</span>
          <m.icon size={22} />
        </div>
        <p className="mode-eyebrow">{m.tag}</p>
        <h3 className="mode-title">{m.title}</h3>
        <p className="mode-desc">{m.desc}</p>
        <div className="mode-enter">Enter mode <ArrowRight size={14} /></div>
      </motion.div>
    </Reveal>
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
  { num: '01', title: 'Professor', tag: 'Socratic learning', desc: 'A Socratic AI mentor that breaks down physics, math, and everyday mechanics — asking the right questions so you truly understand the world.', icon: BrainCircuit, mode: 'professor', color: 'cyan' },
  { num: '02', title: 'Architect', tag: 'Systems thinking', desc: 'Map the moving parts of any problem. Teach an AI student your topic and get scored on clarity — the fastest way to find gaps in your thinking.', icon: Compass, mode: 'architect', color: 'violet' },
  { num: '03', title: 'Ignis', tag: 'Cognitive Companion', desc: 'Your personal AI thinking companion for rich dialogues, thought experiments, and everyday insights — pure text reasoning, zero fluff.', icon: Bot, mode: 'assistant', color: 'emerald' },
  { num: '04', title: 'Study Group', tag: 'Collaborative debate', desc: 'Two AI agents — a skeptic and an advocate — debate your ideas from opposing sides, sharpening your thinking through structured discussion.', icon: Users, mode: 'study-group', color: 'rose' },
];

const capabilities = [
  { title: 'Fractal Derivations', detail: 'Click any variable in an equation to expand it infinitely — each layer goes deeper into fundamental physics.', icon: Layers },
  { title: 'Deep Research Protocol', detail: 'Multi-agent swarm research synthesizes information from multiple angles before delivering a comprehensive answer.', icon: Zap },
  { title: 'Time Machine Mode', detail: 'Travel to the moment of discovery. Experience science as it was first found — derive the laws yourself from raw data.', icon: BookOpen },
  { title: 'Live 3D Simulations', detail: 'Interactive Plotly simulations render directly on the blackboard. Rotate and visualize physics concepts in 3D.', icon: FlaskConical },
  { title: 'Voice Commands', detail: 'Speak naturally to set context, ask questions, and navigate between modes — powered by an offline wake word engine.', icon: Mic },
];

const stats = [
  { value: '4', label: 'THINKING MODES' },
  { value: '∞', label: 'DERIVATION DEPTH' },
  { value: 'LIVE', label: '3D SIMULATIONS' },
  { value: 'ZERO', label: 'JARGON BARRIERS' },
];

export default function NexusLanding({ onLaunchMode, curiosityHooks = [], onLaunchCuriosity, onOpenCuriosityDashboard, onOpenFeedback, onOpenProfile, user, profile, isAdmin }) {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const manifestoRef = useRef(null);
  const ctaRef = useRef(null);
  
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Gamification state: XP and level
  const [wonderXP, setWonderXP] = useState(() => {
    try {
      const saved = localStorage.getItem('scignition_wonder_xp');
      return saved ? parseInt(saved, 10) : 50;
    } catch {
      return 50;
    }
  });

  // Interactive Quiz Spotlight State
  const [activeMysteryIndex, setActiveMysteryIndex] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [userChoiceIdx, setUserChoiceIdx] = useState(null);
  const [cardSeed, setCardSeed] = useState(0);

  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const { scrollYProgress: heroProgress } = useScroll({ 
    target: heroRef, 
    container: containerRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0]);
  const visualY = useTransform(heroProgress, [0, 1], [0, 150]);
  const visualScale = useTransform(heroProgress, [0, 1], [1, 0.9]);

  const { scrollYProgress: manifestoProgress } = useScroll({ 
    target: manifestoRef, 
    container: containerRef,
    offset: ["start end", "end start"]
  });
  const manifestoBgY = useTransform(manifestoProgress, [0, 1], ["-10%", "10%"]);

  const ctaInView = useInView(ctaRef, { once: true, margin: '-20% 0px' });

  // Use everyday mysteries pool as source of truth for high engagement
  const pool = (curiosityHooks && curiosityHooks.length >= 4) ? curiosityHooks : EVERYDAY_MYSTERIES;

  const categories = ['All', 'Everyday Mysteries', 'Nature Superpowers', 'Pocket Magic', 'Mind & Body', 'Cosmic What-Ifs'];
  
  const filteredPool = selectedCategory === 'All' 
    ? pool 
    : pool.filter(h => h.category?.toLowerCase() === selectedCategory.toLowerCase());

  // Show only 3 clean, uncluttered cards
  const displayHooks = filteredPool.slice(cardSeed, cardSeed + 3).length === 3 
    ? filteredPool.slice(cardSeed, cardSeed + 3)
    : filteredPool.slice(0, 3);

  const currentMystery = EVERYDAY_MYSTERIES[activeMysteryIndex % EVERYDAY_MYSTERIES.length];

  const handleMysteryChoice = (idx) => {
    if (quizAnswered) return;
    setUserChoiceIdx(idx);
    setQuizAnswered(true);
    const newXP = wonderXP + 50;
    setWonderXP(newXP);
    try {
      localStorage.setItem('scignition_wonder_xp', String(newXP));
    } catch {}
  };

  const handleNextMystery = () => {
    setQuizAnswered(false);
    setUserChoiceIdx(null);
    setActiveMysteryIndex(prev => (prev + 1) % EVERYDAY_MYSTERIES.length);
  };

  const handleShuffleCards = () => {
    setCardSeed(prev => (prev + 3) % (filteredPool.length > 3 ? filteredPool.length : 1));
  };

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

  // Curiosity Level calculation based on XP
  const curiosityLevel = Math.max(1, Math.floor(wonderXP / 100) + 1);

  return (
    <div className="nexus-landing" ref={containerRef}>
      <div className="nexus-noise" />
      <motion.div className="nexus-progress" style={{ scaleX }} />
      
      {/* === NAVIGATION === */}
      <nav className="nexus-nav">
        <div className="nav-logo" onClick={() => jump('top')} style={{ cursor: 'pointer' }}>
          <span className="logo-hex"><Sparkles size={14} /></span>
          SCIGNITION<span style={{ color: 'var(--cyan)' }}>//</span>OS
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => jump('mission')}>Mission</button>
          <button className="nav-link" onClick={() => jump('modes')}>Modes</button>
          <button className="nav-link" onClick={() => jump('curiosity')}>Ignition Studio</button>
          <button className="nav-link" onClick={() => jump('core')}>Core</button>
          <button className="nav-link" onClick={onOpenFeedback} style={{ color: 'var(--cyan, #6ef6f7)' }}>Feedback</button>
        </div>
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Gamified Wonder XP Badge in Nav */}
          <div className="nav-xp-badge" title="Your Curiosity XP">
            <Trophy size={12} color="#ffd165" />
            <span>{wonderXP} XP</span>
          </div>

          <button 
            type="button"
            onClick={onOpenProfile}
            title={user ? (profile?.display_name || user.email) : "Sign In / Profile"}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#f4f7ff',
              fontFamily: 'DM Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : (user ? 'linear-gradient(135deg, var(--cyan, #6ef6f7), var(--violet, #a996ff))' : 'rgba(255,255,255,0.1)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 'bold', color: user ? '#030508' : '#f4f7ff'
            }}>
              {isAdmin ? '★' : (user ? ((profile?.display_name || user?.email || 'U')[0].toUpperCase()) : '→')}
            </div>
            <span>{isAdmin ? 'Admin' : (user ? (profile?.display_name || 'Profile') : 'Sign In')}</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => go('admin')}
              title="Open Admin Console"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255, 209, 101, 0.12)',
                border: '1px solid rgba(255, 209, 101, 0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#ffd165',
                fontFamily: 'DM Mono, monospace',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Shield size={13} style={{ color: '#ffd165' }} />
              <span>Admin Console</span>
            </button>
          )}
          <button className="btn-launch" onClick={() => go('professor')}>Launch Ignis <ArrowRight size={14} /></button>
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
              >{label === 'Curiosity' ? 'Ignition Studio' : label}</motion.button>
            ))}
            <motion.button className="mob-link"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => { setMobileMenu(false); onOpenFeedback?.(); }}
              style={{ color: 'var(--cyan, #6ef6f7)' }}
            >
              Feedback & Signals
            </motion.button>
            {isAdmin && (
              <motion.button className="mob-link"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                onClick={() => { setMobileMenu(false); go('admin'); }}
                style={{ color: '#ffd165', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
              >
                <Shield size={16} />
                <span>Admin Console</span>
              </motion.button>
            )}
            <motion.button className="mob-link"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              onClick={() => { setMobileMenu(false); onOpenProfile?.(); }}
              style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, var(--cyan, #6ef6f7), var(--violet, #a996ff))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 'bold', color: '#030508'
              }}>
                {isAdmin ? '★' : ((profile?.display_name || user?.email || 'G')[0].toUpperCase())}
              </div>
              <span>{isAdmin ? 'Admin Profile' : (profile?.display_name || (user ? 'My Profile' : 'Sign In / Profile'))}</span>
            </motion.button>
            <motion.button className="btn-launch" style={{ marginTop: 16 }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              onClick={() => go('professor')}
            >Launch Ignis <ArrowRight size={14} /></motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* === HERO === */}
        <section className="nexus-hero" id="top" ref={heroRef}>
          <motion.div className="hero-copy" style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div className="hero-kicker"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Flame size={13} style={{ color: 'var(--amber)' }} />
              <span>THE CURIOSITY IGNITION STUDIO</span>
            </motion.div>

            <h1 className="hero-h1">
              <StaggerWords text="IGNITE" />
              <span className="accent-cyan"><StaggerWords text="WONDER." /></span>
              <br />
              <StaggerWords text="UNRAVEL" />
              <i className="accent-serif"><StaggerWords text="reality." /></i>
            </h1>

            <motion.p className="hero-desc"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              Scignition turns everyday life mysteries into exhilarating revelations. Discover why mirrors flip front-to-back, why hot water freezes faster, and how reality actually works through interactive 3D simulations and Socratic conversations.
            </motion.p>

            <motion.div className="hero-actions"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
            >
              <button className="btn-launch" onClick={() => go('professor')}>Explore with Ignis <ArrowRight size={14} /></button>
              <button className="btn-secondary" onClick={() => jump('curiosity')}>Test Your Intuition <ArrowDownRight size={14} /></button>
            </motion.div>

            <motion.div className="signal-bar"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <span className="signal-dot" />
              Cognitive Engine Ready · Interactive 3D Simulations Online
            </motion.div>

            {/* Everyday Relatable Discovery Chips */}
            <motion.div 
              className="curiosity-chips"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <button 
                className="curiosity-chip" 
                onClick={() => onLaunchCuriosity?.("Why does boiling hot water freeze faster in the freezer than cold water?")}
                title="Explore the Mpemba Effect"
              >
                <Sparkles size={12} /> Why does hot water freeze faster?
              </button>
              <button 
                className="curiosity-chip" 
                onClick={() => onLaunchCuriosity?.("Why don't birds get electrocuted when sitting on 10,000-volt power lines?")}
                title="Explore Electrical Potential"
              >
                <Zap size={12} /> Why don't birds get shocked on wires?
              </button>
              <button 
                className="curiosity-chip" 
                onClick={() => onLaunchCuriosity?.("Why do mirrors flip left-to-right, but never upside-down?")}
                title="Explore Mirror Symmetry"
              >
                <Flame size={12} /> Why do mirrors flip sideways, not up-down?
              </button>
            </motion.div>
          </motion.div>

          <motion.div className="hero-visual"
            style={{ y: visualY, scale: visualScale, opacity: heroOpacity }}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="orbital-canvas">
              <OrbitalCore />
            </div>
            <div className="orbital-label label-top">IGNIS//CORE <span>ACTIVE</span></div>
            <div className="orbital-label label-bottom"><strong>COGNITION 02.00</strong><em>STABLE</em></div>
          </motion.div>

          <div className="scroll-hint">SCROLL TO EXPLORE <span className="scroll-line" /></div>
        </section>

        {/* === STATS STRIP === */}
        <div className="stats-strip">
          {stats.map((s, i) => (
            <Reveal key={i} className="stat-item" delay={i * 0.08} scale blur>
              <div className="stat-value"><StatValue value={s.value} delay={i * 0.08} /></div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>

        {/* === MANIFESTO === */}
        <section className="manifesto-section" id="mission" ref={manifestoRef}>
          <motion.div className="manifesto-bg" style={{ backgroundImage: "url('/nexus/astronaut-frames/ezgif-frame-120.jpg')", y: manifestoBgY }} />
          <div className="manifesto-overlay" />
          <div className="manifesto-grid">
            <Reveal direction="left" blur>
              <span className="section-tag">Why Scignition</span>
              <LineWipe />
              <h2 className="manifesto-h2">THE BEST WORK<br />STARTS WITH A<br /><span>BETTER QUESTION.</span></h2>
            </Reveal>
            <Reveal className="manifesto-copy" delay={0.12} direction="right" blur>
              <p>You don't need a PhD to be astonished by how the universe functions. Scignition was created to ignite the dormant spark of curiosity in every human mind—translating everyday oddities into unforgettable first-principles intuition.</p>
              <p>Search engines give you sterile answers. Scignition gives you true comprehension. It invites you to test your intuition, watch physical phenomena come alive on 3D blackboards, and leave every session measurably smarter.</p>
              <button className="text-link" onClick={() => jump('modes')}>Explore all modes <ArrowRight size={14} /></button>
            </Reveal>
          </div>
        </section>

        {/* === MODES === */}
        <section className="modes-section" id="modes">
          <Reveal blur>
            <span className="section-tag">Choose your focus</span>
            <LineWipe />
            <h2 className="modes-heading">AN INTERFACE FOR<br /><span>EVERY KIND OF THINKING.</span></h2>
          </Reveal>
          <div className="mode-grid">
            {modes.map((m, i) => (
              <ModeCard key={m.mode} m={m} i={i} go={go} />
            ))}
          </div>
        </section>

        {/* === GAMIFIED CURIOSITY IGNITION STUDIO (Problem 1, 4, 5 Solution) === */}
        <section className="curiosity-section" id="curiosity">
          <div className="curiosity-container">
            <Reveal blur>
              <div className="curiosity-header-row">
                <div>
                  <span className="section-tag">◆ Curiosity Ignition Studio</span>
                  <LineWipe />
                  <h2 className="curiosity-heading">
                    DARE TO QUESTION REALITY.<br />
                    <span>TEST YOUR INTUITION.</span>
                  </h2>
                  <p className="curiosity-subtext">
                    Even simple things around you hide mind-blowing science. Pick your hunch below or spin a random mystery to discover how reality actually behaves.
                  </p>
                </div>

                {/* Gamified Rank Card */}
                <div className="gamified-rank-card">
                  <div className="rank-top">
                    <Trophy size={18} color="#ffd165" />
                    <span className="rank-title">Curiosity Rank: Level {curiosityLevel} Explorer</span>
                  </div>
                  <div className="rank-progress-bar">
                    <div className="rank-fill" style={{ width: `${Math.min(100, (wonderXP % 100) * 2)}%` }} />
                  </div>
                  <div className="rank-subtext">
                    <span>{wonderXP} Wonder XP</span>
                    <span>Next Level: {curiosityLevel * 100} XP</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* FEATURED INTERACTIVE MYSTERY ARENA */}
            <div className="mystery-arena-box">
              <div className="mystery-arena-header">
                <div className="mystery-badge-row">
                  <span className="mystery-pill-category">{currentMystery.category}</span>
                  <span className="mystery-pill-badge" style={{ borderColor: getHookTypeColor(currentMystery.hook_type), color: getHookTypeColor(currentMystery.hook_type) }}>
                    {currentMystery.hook_type.toUpperCase()}
                  </span>
                </div>
                <button className="mystery-spin-btn" onClick={handleNextMystery} title="Spin another mystery">
                  <RotateCcw size={14} />
                  <span>Spin Mystery</span>
                </button>
              </div>

              <h3 className="mystery-arena-question">
                "{currentMystery.question}"
              </h3>

              {!quizAnswered ? (
                <div className="mystery-options-grid">
                  <div className="mystery-options-prompt">What does your intuition say?</div>
                  <div className="mystery-options-buttons">
                    {currentMystery.options?.map((opt, oIdx) => (
                      <button 
                        key={oIdx} 
                        className="mystery-opt-btn"
                        onClick={() => handleMysteryChoice(oIdx)}
                      >
                        <span className="opt-num">{oIdx === 0 ? 'A' : 'B'}</span>
                        <span className="opt-text">{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div 
                  className="mystery-reveal-box"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="reveal-badge">
                    <Sparkles size={16} color="var(--cyan)" />
                    <span>Mind Blow Revealed! (+50 XP Earned)</span>
                  </div>
                  <p className="reveal-teaser-text">{currentMystery.teaser}</p>
                  <div className="reveal-actions">
                    <button 
                      className="btn-launch" 
                      onClick={() => onLaunchCuriosity?.(currentMystery.question)}
                    >
                      <span>⚡ Unravel with Ignis (Full Socratic Breakdown)</span>
                      <ArrowRight size={14} />
                    </button>
                    <button className="btn-secondary" onClick={handleNextMystery}>
                      Next Mystery <RotateCcw size={13} style={{ marginLeft: 6 }} />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Streamlined Category Filters */}
            <div className="curiosity-filter-bar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`curiosity-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(cat); setCardSeed(0); }}
                >
                  {cat}
                </button>
              ))}
              <button 
                className="curiosity-filter-btn" 
                onClick={handleShuffleCards}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--cyan)' }}
              >
                <RotateCcw size={12} /> Shuffle 3
              </button>
            </div>

            {/* Clean 3-Card Discovery Grid (Clean look, NO 10-card clutter) */}
            <div className="curiosity-cards-grid">
              {displayHooks.map((hook, idx) => {
                const typeColor = getHookTypeColor(hook.hook_type);
                return (
                  <Reveal key={idx} delay={idx * 0.06} className="curiosity-card">
                    <div 
                      className="curiosity-card-inner" 
                      onClick={() => onLaunchCuriosity?.(hook.question)}
                    >
                      <div className="curiosity-card-top">
                        <span className="curiosity-type-badge" style={{ borderColor: typeColor, color: typeColor }}>
                          {hook.hook_type?.toUpperCase() || 'MYSTERY'}
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
                        <span>Investigate with Ignis</span>
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
                  Explore Full Curiosity Vault
                </button>
              </div>
            )}
          </div>
        </section>

        {/* === CORE CAPABILITIES === */}
        <section className="core-section" id="core">
          <div className="core-grid">
            <Reveal className="core-intro" direction="left" blur>
              <span className="section-tag">Scignition intelligence layer</span>
              <LineWipe />
              <h2 className="core-heading">YOUR CURIOSITY,<br /><span>AMPLIFIED.</span></h2>
              <p className="core-desc">Behind the interface is a powerful suite of cognitive tools engineered to turn simple curiosity into deep conceptual mastery and real-time computation.</p>
              <button className="btn-launch" onClick={() => go('architect')}>Plan with Architect <ArrowRight size={14} /></button>

              <div className="console-card">
                <div className="console-bar">
                  <span><Cpu size={12} /> IGNIS // SESSION PREVIEW</span>
                  <span className="console-live"><span className="signal-dot" style={{ width: 5, height: 5 }} /> READY</span>
                </div>
                <div className="console-body">
                  <p className="console-user">Why does coffee wake me up if it doesn't give real physical energy?</p>
                  <p className="console-ai"><b>IGNIS</b> — Imagine your brain is full of parking spots for sleep signals (adenosine). When they park, you feel exhausted. Caffeine is a phantom sports car that parks in every spot without turning on the sleep signal. Your brain never knows it's tired...</p>
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
        <section className="cta-section" ref={ctaRef}>
          <motion.div 
            className="cta-glow"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={ctaInView ? { scale: [0.5, 1.5, 1], opacity: [0, 1, 0] } : {}}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <Reveal className="cta-inner" scale blur>
            <Orbit size={28} className={ctaInView ? "cta-orbit-float" : ""} style={{ color: 'var(--cyan)', marginBottom: 12 }} />
            <p className="cta-tag">SCIGNITION IS READY</p>
            <h2 className="cta-heading">BRING ANY QUESTION.<br /><span>LEAVE WITH WONDER.</span></h2>
            <button className="btn-launch cta-btn" onClick={() => go('professor')}>Launch Scignition <ArrowRight size={14} /></button>
          </Reveal>
        </section>
      </main>

      {/* === FOOTER === */}
      <footer className="nexus-footer">
        <div className="footer-left">
          <div className="nav-logo" style={{ opacity: 0.5, fontSize: 11 }}>
            <span className="logo-hex" style={{ width: 20, height: 20, filter: 'grayscale(0.5)' }}><Sparkles size={10} /></span>
            SCIGNITION//OS
          </div>
          <span>Igniting the spark of wonder and discovery in every human mind.</span>
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
