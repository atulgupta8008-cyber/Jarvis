import os
import re

def modify_jsx():
    jsx_path = r'c:\Users\atulg\Desktop\Jarvis\jarvis_web\src\components\NexusLanding.jsx'
    with open(jsx_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Imports
    content = content.replace(
        "import React, { useState, useRef, useCallback } from 'react';",
        "import React, { useState, useRef, useCallback, useEffect } from 'react';"
    )
    content = content.replace(
        "import { motion, useInView, AnimatePresence } from 'framer-motion';",
        "import { motion, useInView, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';"
    )

    # Replace Reveal
    old_reveal = """function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
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
}"""

    new_reveal = """function Reveal({ children, className = '', delay = 0, direction = 'up', scale, rotate, blur }) {
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
}"""
    content = content.replace(old_reveal, new_reveal)

    # Component body
    old_comp = """export default function NexusLanding({ onLaunchMode, curiosityHooks = [], onLaunchCuriosity, onOpenCuriosityDashboard, onOpenFeedback, onOpenProfile, user, profile, isAdmin }) {
  const [scroll, setScroll] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');"""

    new_comp = """export default function NexusLanding({ onLaunchMode, curiosityHooks = [], onLaunchCuriosity, onOpenCuriosityDashboard, onOpenFeedback, onOpenProfile, user, profile, isAdmin }) {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const manifestoRef = useRef(null);
  const ctaRef = useRef(null);
  
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

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

  const ctaInView = useInView(ctaRef, { once: true, margin: '-20% 0px' });"""
    content = content.replace(old_comp, new_comp)

    # Remove onScroll
    content = re.sub(r'  const onScroll = useCallback\(\(e\) => \{[\s\S]*?\}, \[\]\);\n', '', content)

    # Replace main div
    content = content.replace('<div className="nexus-landing" onScroll={onScroll}>', '<div className="nexus-landing" ref={containerRef}>')
    content = content.replace('<div className="nexus-progress" style={{ transform: `scaleX(${scroll})` }} />', '<motion.div className="nexus-progress" style={{ scaleX }} />')

    # Hero
    content = content.replace('<section className="nexus-hero" id="top">', '<section className="nexus-hero" id="top" ref={heroRef}>')
    content = content.replace('<div className="hero-copy">', '<motion.div className="hero-copy" style={{ y: heroY, opacity: heroOpacity }}>')
    content = content.replace('</div>\n\n          <motion.div className="hero-visual"', '</motion.div>\n\n          <motion.div className="hero-visual"')
    content = content.replace('className="hero-visual"\n            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}', 'className="hero-visual"\n            style={{ y: visualY, scale: visualScale, opacity: heroOpacity }}\n            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}')

    # Stats
    old_stats = """        {/* === STATS STRIP === */}
        <div className="stats-strip">
          {stats.map((s, i) => (
            <Reveal key={i} className="stat-item" delay={i * 0.08}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>"""
    new_stats = """        {/* === STATS STRIP === */}
        <div className="stats-strip">
          {stats.map((s, i) => (
            <Reveal key={i} className="stat-item" delay={i * 0.08} scale blur>
              <div className="stat-value"><StatValue value={s.value} delay={i * 0.08} /></div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>"""
    content = content.replace(old_stats, new_stats)

    # Manifesto
    content = content.replace('<section className="manifesto-section" id="mission">', '<section className="manifesto-section" id="mission" ref={manifestoRef}>')
    content = content.replace('<div className="manifesto-bg" style={{ backgroundImage: "url(\'/nexus/astronaut-frames/ezgif-frame-120.jpg\')" }} />', '<motion.div className="manifesto-bg" style={{ backgroundImage: "url(\'/nexus/astronaut-frames/ezgif-frame-120.jpg\')", y: manifestoBgY }} />')
    
    old_mani_reveal = """            <Reveal>
              <span className="section-tag">Why Jarvis</span>
              <h2 className="manifesto-h2">THE BEST WORK<br />STARTS WITH A<br /><span>BETTER QUESTION.</span></h2>
            </Reveal>
            <Reveal className="manifesto-copy" delay={0.12}>"""
    new_mani_reveal = """            <Reveal direction="left" blur>
              <span className="section-tag">Why Jarvis</span>
              <LineWipe />
              <h2 className="manifesto-h2">THE BEST WORK<br />STARTS WITH A<br /><span>BETTER QUESTION.</span></h2>
            </Reveal>
            <Reveal className="manifesto-copy" delay={0.12} direction="right" blur>"""
    content = content.replace(old_mani_reveal, new_mani_reveal)

    # Modes
    old_modes = """        {/* === MODES === */}
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
        </section>"""
    new_modes = """        {/* === MODES === */}
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
        </section>"""
    content = content.replace(old_modes, new_modes)

    # Curiosity
    old_cur = """            <Reveal>
              <span className="section-tag">◆ Daily Curiosity Engine</span>
              <h2 className="curiosity-heading">"""
    new_cur = """            <Reveal blur>
              <span className="section-tag">◆ Daily Curiosity Engine</span>
              <LineWipe />
              <h2 className="curiosity-heading">"""
    content = content.replace(old_cur, new_cur)

    # Core
    old_core = """            <Reveal className="core-intro">
              <span className="section-tag">Jarvis intelligence layer</span>
              <h2 className="core-heading">YOUR INTENT,<br /><span>AMPLIFIED.</span></h2>"""
    new_core = """            <Reveal className="core-intro" direction="left" blur>
              <span className="section-tag">Jarvis intelligence layer</span>
              <LineWipe />
              <h2 className="core-heading">YOUR INTENT,<br /><span>AMPLIFIED.</span></h2>"""
    content = content.replace(old_core, new_core)

    # CTA
    old_cta = """        {/* === CTA === */}
        <section className="cta-section">
          <Reveal className="cta-inner">
            <Orbit size={28} style={{ color: 'var(--cyan)', marginBottom: 12 }} />"""
    new_cta = """        {/* === CTA === */}
        <section className="cta-section" ref={ctaRef}>
          <motion.div 
            className="cta-glow"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={ctaInView ? { scale: [0.5, 1.5, 1], opacity: [0, 1, 0] } : {}}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <Reveal className="cta-inner" scale blur>
            <Orbit size={28} className={ctaInView ? "cta-orbit-float" : ""} style={{ color: 'var(--cyan)', marginBottom: 12 }} />"""
    content = content.replace(old_cta, new_cta)

    with open(jsx_path, 'w', encoding='utf-8') as f:
        f.write(content)

    css_path = r'c:\Users\atulg\Desktop\Jarvis\jarvis_web\src\components\NexusLanding.css'
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    new_css = """
/* Scroll Animation Enhancements */

/* Mode cards 3D tilt */
.mode-grid {
  perspective: 1200px;
}

/* Horizontal line wipe */
.scroll-line-wipe {
  width: 80px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--cyan), transparent);
  margin: 16px 0 28px;
  transform-origin: center;
}

/* Stats counter animation */
.stat-value {
  font-variant-numeric: tabular-nums;
}

/* CTA glow on scroll */
.cta-glow {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(110, 246, 247, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Blur reveal support */
.blur-reveal {
  will-change: filter, opacity, transform;
}

/* Floating animation for orbit icon */
@keyframes float-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.cta-orbit-float {
  animation: float-gentle 3s ease-in-out infinite;
}

/* Hero parallax layers */
.hero-copy, .hero-visual {
  will-change: transform, opacity;
}

/* Smooth section transitions */
.manifesto-section, .modes-section, .curiosity-section, .core-section, .cta-section {
  will-change: auto;
}
"""
    # Insert new_css before media queries
    css = css.replace("/* \n * ==========================================\n * 11. RESPONSIVE QUERIES\n * ==========================================\n */", new_css + "\n/* \n * ==========================================\n * 11. RESPONSIVE QUERIES\n * ==========================================\n */")

    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css)

modify_jsx()
