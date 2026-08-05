import React, { useState, useEffect, useRef } from 'react';
import { Settings, Activity, Cpu, MemoryStick, Battery, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import InfinityCore from './components/InfinityCore';
import ChatPanel from './components/ChatPanel';
import DataPanel from './components/DataPanel';
import SettingsModal from './components/SettingsModal';
import ProfessorMode from './components/ProfessorMode';
import StudyGroupMode from './components/StudyGroupMode';
import ArchitectMode from './components/ArchitectMode';
import SandboxMode from './components/SandboxMode';
import NexusHubModal from './components/NexusHubModal';
import BackgroundFX from './components/BackgroundFX';
import CuriosityOrb from './components/CuriosityOrb';
import CuriosityDashboard from './components/CuriosityDashboard';
import { WS_URL } from './config';

const RadialProgress = ({ value, icon: Icon, label, color }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '16px', border: '1px solid var(--glass-border)', backdropFilter: 'blur(10px)' }}>
      <div style={{ position: 'relative', width: '50px', height: '50px' }}>
        <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="25" cy="25" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
          <motion.circle 
            cx="25" cy="25" r={radius} 
            stroke={color} strokeWidth="4" fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: color }}>
          <Icon size={16} />
        </div>
      </div>
      <div style={{ fontFamily: 'Fira Code', fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>{label} {(value || 0).toFixed(0)}%</div>
    </div>
  );
};

function App() {
  const [state, setState] = useState({
    status: 'sleeping',
    mainText: 'System Standby',
    subText: 'Say "Jarvis" to wake up'
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfessorModeActive, setIsProfessorModeActive] = useState(false);
  const [isStudyGroupModeActive, setIsStudyGroupModeActive] = useState(false);
  const [isArchitectModeActive, setIsArchitectModeActive] = useState(false);
  const [isSandboxModeActive, setIsSandboxModeActive] = useState(false);
  const [isNexusHubActive, setIsNexusHubActive] = useState(true); // Main landing home page
  const [curiosityQuestion, setCuriosityQuestion] = useState(null);
  const [telemetry, setTelemetry] = useState({ cpu: 0, ram: 0, batt: 100 });
  const [commandText, setCommandText] = useState('');
  const [curiosityHooks, setCuriosityHooks] = useState([]);
  const [isCuriosityDashboardOpen, setIsCuriosityDashboardOpen] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    let isSubscribed = true;
    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'curiosity_feed_request' }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'curiosity_feed_response' && isSubscribed) {
          setCuriosityHooks(data.hooks || []);
          socket.close();
        }
      } catch (err) {
        console.error("Error parsing curiosity feed", err);
      }
    };

    return () => {
      isSubscribed = false;
      socket.close();
    };
  }, []);

  const handleLaunchMode = (mode) => {
    setIsNexusHubActive(false);
    setIsProfessorModeActive(false);
    setIsStudyGroupModeActive(false);
    setIsArchitectModeActive(false);
    setIsSandboxModeActive(false);

    if (mode === 'professor' || mode === 'teacher') {
      setIsProfessorModeActive(true);
    } else if (mode === 'study-group' || mode === 'debates') {
      setIsStudyGroupModeActive(true);
    } else if (mode === 'architect' || mode === 'curiosity') {
      setIsArchitectModeActive(true);
    } else if (mode === 'sandbox') {
      setIsSandboxModeActive(true);
    }
  };

  const handleLaunchCuriosity = (question) => {
    setIsNexusHubActive(false);
    setIsProfessorModeActive(true);
    setCuriosityQuestion(question);
    setIsCuriosityDashboardOpen(false);
  };

  const handleReturnToNexus = () => {
    setIsProfessorModeActive(false);
    setIsStudyGroupModeActive(false);
    setIsArchitectModeActive(false);
    setIsSandboxModeActive(false);
    setCuriosityQuestion(null);
    setIsNexusHubActive(true);
  };

  // Audio Context for synthetic beeps
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch {
    }
  };

  useEffect(() => {
    if (isNexusHubActive) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'system_command', action: 'resume_voice_agent' }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setState({ status: data.state, mainText: data.main_text, subText: data.sub_text });
        } else if (data.type === 'chat') {
          setChatHistory(prev => [...prev, { role: data.role, message: data.message }]);
        } else if (data.type === 'dashboard' || data.type === 'html_view') {
          setDashboardData(data);
        } else if (data.type === 'telemetry') {
          setTelemetry({ cpu: data.cpu, ram: data.ram, batt: data.batt });
        }
      } catch {
      }
    };

    ws.current.onclose = () => {
      setState({ status: 'sleeping', mainText: 'Connection Lost', subText: 'Trying to reconnect...' });
    };

    return () => { if (ws.current) { ws.current.close(); ws.current = null; } };
  }, [isNexusHubActive]);

  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter' && commandText.trim() !== '') {
      playBeep(); // Subtle sound effect
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'text_command', text: commandText }));
      }
      setCommandText('');
    }
  };

  return (
    <>
      <div className="hud-container" style={{ opacity: isNexusHubActive ? 0 : 1, pointerEvents: isNexusHubActive ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
        <BackgroundFX status={state.status} />
        
        {/* Top Right Settings Button */}
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={24} />
        </button>

        {/* Left Panel: Chat History */}
        <motion.div 
          className="glass-panel side-panel"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="panel-title"><Activity size={18} style={{display:'inline', marginRight:'10px', verticalAlign:'text-bottom'}}/> Comms Link</h2>
          <ChatPanel history={chatHistory} />
        </motion.div>

        {/* Center Panel: Quantum Core & Telemetry */}
        <motion.div 
          className="center-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Holographic Telemetry HUD */}
          <div className="telemetry-hud top-left">
            <RadialProgress value={telemetry.cpu} icon={Cpu} label="CPU" color="var(--ethereal-cyan)" />
          </div>
          <div className="telemetry-hud middle-left">
            <RadialProgress value={telemetry.ram} icon={MemoryStick} label="RAM" color="var(--ethereal-purple)" />
          </div>
          <div className="telemetry-hud bottom-left">
            <RadialProgress value={telemetry.batt} icon={Battery} label="PWR" color="var(--ethereal-blue)" />
          </div>

          <InfinityCore state={state.status} />
          
          <div className={`status-text state-${state.status}`}>
            <div className="status-main">{state.mainText}</div>
            <div className="status-sub">{state.subText}</div>
          </div>

          {/* Hacker-Style Text Input under the Core */}
          <div className="command-line-wrapper">
            <span className="command-prompt">&gt;</span>
            <input 
              type="text" 
              className="command-input" 
              placeholder="Awaiting directive..." 
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              onKeyDown={handleCommandSubmit}
              autoFocus
            />
          </div>
        </motion.div>

        {/* Right Panel: Data Dashboard */}
        <motion.div 
          className="glass-panel data-panel"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="panel-title"><Activity size={18} style={{display:'inline', marginRight:'10px', verticalAlign:'text-bottom'}}/> Telemetry & Data</h2>
          <DataPanel data={dashboardData} />
        </motion.div>

        {/* Top Center Return to NEXUS Home Button (Inside Assistant HUD) */}
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button 
            onClick={handleReturnToNexus}
            style={{
              background: 'rgba(157, 78, 221, 0.15)',
              border: '1px solid rgba(157, 78, 221, 0.4)',
              color: '#9d4edd',
              padding: '10px 20px',
              borderRadius: '25px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'Orbitron',
              boxShadow: '0 0 15px rgba(157, 78, 221, 0.3)'
            }}
          >
            <Layers size={20} /> JARVIS NEXUS HOME
          </button>
        </div>

        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      </div>

      {isNexusHubActive && curiosityHooks.length > 0 && (
        <CuriosityOrb 
          hooks={curiosityHooks} 
          onLaunchCuriosity={handleLaunchCuriosity} 
          onOpenDashboard={() => setIsCuriosityDashboardOpen(true)} 
        />
      )}
      <AnimatePresence>
        {isNexusHubActive && isCuriosityDashboardOpen && (
          <CuriosityDashboard 
            hooks={curiosityHooks} 
            onClose={() => setIsCuriosityDashboardOpen(false)} 
            onLaunchCuriosity={handleLaunchCuriosity} 
          />
        )}
      </AnimatePresence>

      {/* Overlays & Modals */}
      <NexusHubModal 
        isActive={isNexusHubActive}
        onClose={() => setIsNexusHubActive(false)} 
        onLaunchMode={handleLaunchMode}
        onLaunchCuriosity={handleLaunchCuriosity}
      />
      
      <AnimatePresence>
        {isProfessorModeActive && (
          <ProfessorMode onExit={handleReturnToNexus} curiosityQuestion={curiosityQuestion} />
        )}
        {isStudyGroupModeActive && (
          <StudyGroupMode onExit={handleReturnToNexus} />
        )}
        {isArchitectModeActive && (
          <ArchitectMode onExit={handleReturnToNexus} />
        )}
        {isSandboxModeActive && (
          <SandboxMode onExit={handleReturnToNexus} />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
