import React, { useState, useEffect, useRef } from 'react';
import { Layers, Send, Activity, Radio, Cpu, Sparkles, MessageSquare, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import InfinityCore from './components/InfinityCore';
import ChatPanel from './components/ChatPanel';
import DataPanel from './components/DataPanel';
import ProfessorMode from './components/ProfessorMode';
import StudyGroupMode from './components/StudyGroupMode';
import ArchitectMode from './components/ArchitectMode';
import SandboxMode from './components/SandboxMode';
import NexusHubModal from './components/NexusHubModal';
import BackgroundFX from './components/BackgroundFX';
import CuriosityOrb from './components/CuriosityOrb';
import CuriosityDashboard from './components/CuriosityDashboard';
import FeedbackModal from './components/FeedbackModal';
import AuthModal from './components/AuthModal';
import OnboardingSurvey from './components/OnboardingSurvey';
import ProfileView from './components/ProfileView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WS_URL } from './config';

const DEFAULT_CURIOSITY_HOOKS = [
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

// URL Router mapping helpers
const getModeFromPath = (pathname, search = window.location.search) => {
  const path = (pathname || window.location.pathname).toLowerCase().replace(/\/+$/, '') || '/';
  const urlParams = new URLSearchParams(search);
  const qParam = urlParams.get('q') || urlParams.get('question');
  
  if (path === '/profile') {
    return { mode: 'nexus', isProfile: true, question: qParam };
  }
  if (path === '/professor' || path === '/teacher' || path === '/socratic') {
    return { mode: 'professor', question: qParam };
  }
  if (path === '/architect' || path === '/systems') {
    return { mode: 'architect', question: qParam };
  }
  if (path === '/assistant' || path === '/jarvis' || path === '/voice') {
    return { mode: 'assistant', question: qParam };
  }
  if (path === '/study-group' || path === '/study' || path === '/debates') {
    return { mode: 'study-group', question: qParam };
  }
  if (path === '/sandbox' || path === '/workspace') {
    return { mode: 'sandbox', question: qParam };
  }
  if (path === '/curiosity' || path === '/curiosity-feed') {
    return { mode: 'curiosity', question: qParam };
  }
  return { mode: 'nexus', question: qParam };
};

const getPathFromMode = (mode, question) => {
  let path = '/';
  if (mode === 'professor') path = '/professor';
  else if (mode === 'architect') path = '/architect';
  else if (mode === 'assistant' || mode === 'jarvis') path = '/jarvis';
  else if (mode === 'study-group') path = '/study-group';
  else if (mode === 'sandbox') path = '/sandbox';
  else if (mode === 'curiosity') path = '/curiosity';
  
  if (question && mode === 'professor') {
    path += `?q=${encodeURIComponent(question)}`;
  }
  return path;
};

const getTitleFromMode = (mode) => {
  switch (mode) {
    case 'professor': return 'Professor Mode — Socratic AI Tutor | Jarvis';
    case 'architect': return 'Architect Mode — Systems Thinking | Jarvis';
    case 'assistant':
    case 'jarvis': return 'Jarvis AI — Voice & Intelligence Workspace';
    case 'study-group': return 'Study Group — Collaborative AI Debate | Jarvis';
    case 'sandbox': return 'Sandbox Workspace | Jarvis';
    case 'curiosity': return 'Curiosity Feed | Jarvis';
    default: return 'Jarvis AI — Personal Intelligence Platform';
  }
};

function AppContent() {
  const { user, profile, isAdmin, loading, showAuthModal, setShowAuthModal } = useAuth();
  const [state, setState] = useState({
    status: 'sleeping',
    mainText: 'System Standby',
    subText: 'Say "Jarvis" or type a directive below'
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfessorModeActive, setIsProfessorModeActive] = useState(false);
  const [isStudyGroupModeActive, setIsStudyGroupModeActive] = useState(false);
  const [isArchitectModeActive, setIsArchitectModeActive] = useState(false);
  const [isSandboxModeActive, setIsSandboxModeActive] = useState(false);
  const [isNexusHubActive, setIsNexusHubActive] = useState(true);
  const [curiosityQuestion, setCuriosityQuestion] = useState(null);
  const [commandText, setCommandText] = useState('');
  const [curiosityHooks, setCuriosityHooks] = useState(DEFAULT_CURIOSITY_HOOKS);
  const [isCuriosityDashboardOpen, setIsCuriosityDashboardOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat');
  const [pendingIntent, setPendingIntent] = useState(null); // { mode, question }
  const ws = useRef(null);

  const applyRoute = (mode, question = null, pushState = true) => {
    setIsNexusHubActive(mode === 'nexus');
    setIsProfessorModeActive(mode === 'professor');
    setIsStudyGroupModeActive(mode === 'study-group');
    setIsArchitectModeActive(mode === 'architect');
    setIsSandboxModeActive(mode === 'sandbox');
    setIsCuriosityDashboardOpen(mode === 'curiosity');
    if (question !== undefined) {
      setCuriosityQuestion(question);
    }
    document.title = getTitleFromMode(mode);

    if (pushState) {
      const targetUrl = getPathFromMode(mode, question);
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== targetUrl) {
        window.history.pushState({ mode, question }, '', targetUrl);
      }
    }
  };

  useEffect(() => {
    const route = getModeFromPath(window.location.pathname, window.location.search);
    if (route.isProfile) {
      if (!user) {
        setShowAuthModal(true);
        applyRoute('nexus', null, false);
      } else {
        setIsProfileOpen(true);
        applyRoute(route.mode, route.question, false);
      }
    } else {
      applyRoute(route.mode, route.question, false);
    }

    const onPopState = () => {
      const currentRoute = getModeFromPath(window.location.pathname, window.location.search);
      if (currentRoute.isProfile) {
        if (!user) {
          setShowAuthModal(true);
          applyRoute('nexus', null, false);
        } else {
          setIsProfileOpen(true);
          applyRoute(currentRoute.mode, currentRoute.question, false);
        }
      } else {
        applyRoute(currentRoute.mode, currentRoute.question, false);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // When unauthenticated user tries to access protected modes directly, redirect to nexus and prompt login
  useEffect(() => {
    if (!loading && !user) {
      const isAnyModeActive = isProfessorModeActive || isStudyGroupModeActive || isArchitectModeActive || isSandboxModeActive || (!isNexusHubActive && !isCuriosityDashboardOpen);
      if (isAnyModeActive) {
        setShowAuthModal(true);
        applyRoute('nexus', null, false);
      }
    }
  }, [loading, user, isProfessorModeActive, isStudyGroupModeActive, isArchitectModeActive, isSandboxModeActive, isNexusHubActive, isCuriosityDashboardOpen]);

  // When user successfully authenticates and had a pending mode clicked, seamlessly enter that mode
  useEffect(() => {
    if (user && pendingIntent) {
      applyRoute(pendingIntent.mode, pendingIntent.question, true);
      setPendingIntent(null);
    }
  }, [user, pendingIntent]);

  const userRef = useRef(user);
  userRef.current = user;
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  // Account switch / logout: reset conversation display to isolate accounts
  useEffect(() => {
    setChatHistory([]);
    setDashboardData(null);
    if (!user) {
      setIsProfessorModeActive(false);
      setIsStudyGroupModeActive(false);
      setIsArchitectModeActive(false);
      setIsSandboxModeActive(false);
      setIsNexusHubActive(true);
      setIsProfileOpen(false);
    }
  }, [user?.id, isAdmin]);

  // Client-Side Immediate Warmup Probe & Periodic Keep-Alive Heartbeat
  useEffect(() => {
    const warmUpBackend = async () => {
      try {
        await fetch(`${API_URL}/health`, { mode: 'no-cors' });
      } catch {}
    };
    // Immediate ping upon page load
    warmUpBackend();
    // Maintain keepalive every 4 minutes while browser tab is open
    const interval = setInterval(warmUpBackend, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Keep Main WebSocket connection alive
  useEffect(() => {
    let isSubscribed = true;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(WS_URL);
        ws.current = socket;

        socket.onopen = () => {
          if (!isSubscribed) return;
          const currentId = userRef.current?.id;
          const currentAdmin = isAdminRef.current;
          socket.send(JSON.stringify({ 
            type: 'curiosity_feed_request',
            interested_subjects: profile?.interested_subjects,
            language: profile?.language,
            user_id: currentId,
            role: currentAdmin ? 'admin' : 'user',
            user_profile: profile
          }));
          socket.send(JSON.stringify({ type: 'system_command', action: 'resume_voice_agent' }));
        };

        socket.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'curiosity_feed_response' && data.hooks && data.hooks.length > 0) {
              setCuriosityHooks(data.hooks);
            } else if (data.type === 'state') {
              setState({ status: data.state, mainText: data.main_text, subText: data.sub_text });
            } else if (data.type === 'chat') {
              const currentId = userRef.current?.id;
              const currentAdmin = isAdminRef.current;
              const myUserKey = currentId || (currentAdmin ? 'admin_master' : null);
              
              if (!myUserKey || (data.user_id && data.user_id !== myUserKey)) {
                return;
              }
              
              setChatHistory(prev => {
                if ((data.role === 'You' || data.role === 'user') && prev.length > 0) {
                  const lastMsg = prev[prev.length - 1];
                  if ((lastMsg.role === 'You' || lastMsg.role === 'user') && lastMsg.message === data.message) {
                    return prev;
                  }
                }
                return [...prev, { role: data.role, message: data.message }];
              });
            } else if (data.type === 'dashboard' || data.type === 'html_view') {
              setDashboardData(data);
            }
          } catch {
          }
        };

        socket.onclose = () => {
          if (isSubscribed) {
            setState({ status: 'sleeping', mainText: 'System Standby', subText: 'Connecting...' });
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        socket.onerror = () => {
        };
      } catch {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  // Dynamically re-request curiosity feed when user subjects or language changes
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        type: 'curiosity_feed_request',
        interested_subjects: profile?.interested_subjects,
        language: profile?.language,
        user_id: user?.id,
        role: isAdmin ? 'admin' : 'user',
        user_profile: profile
      }));
    }
  }, [profile?.interested_subjects, profile?.language, user?.id, isAdmin]);

  const handleLaunchMode = (mode) => {
    if (!user && mode !== 'nexus' && mode !== 'curiosity') {
      setPendingIntent({ mode, question: null });
      setShowAuthModal(true);
      return;
    }
    applyRoute(mode, null, true);
  };

  const handleLaunchCuriosity = (question) => {
    if (!user) {
      setPendingIntent({ mode: 'professor', question });
      setShowAuthModal(true);
      return;
    }
    applyRoute('professor', question, true);
  };

  const handleOpenProfile = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsProfileOpen(true);
  };

  const handleReturnToNexus = () => {
    applyRoute('nexus', null, true);
  };

  const handleOpenCuriosity = () => {
    applyRoute('curiosity', null, true);
  };

  const handleCloseCuriosity = () => {
    applyRoute('nexus', null, true);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
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

  const sendCommand = (text) => {
    if (!text || text.trim() === '') return;
    playBeep();
    const cleanText = text.trim();
    setChatHistory(prev => [...prev, { role: 'user', message: cleanText }]);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const currentId = userRef.current?.id;
      const currentAdmin = isAdminRef.current;
      ws.current.send(JSON.stringify({ 
        type: 'text_command', 
        text: cleanText,
        user_profile: profile,
        role: currentAdmin ? 'admin' : 'user',
        user_id: currentId
      }));
    }
    setCommandText('');
  };

  const isAssistantActive = !isNexusHubActive && !isProfessorModeActive && !isStudyGroupModeActive && !isArchitectModeActive && !isSandboxModeActive;

  return (
    <>
      {/* JARVIS AI ASSISTANT HUD */}
      {isAssistantActive && (
        <div className="hud-container assistant-stage-layout">
          <BackgroundFX status={state.status} />
          
          <header className="assistant-header-bar">
            <div className="assistant-header-left">
              <button 
                className="hud-nexus-return-btn"
                onClick={handleReturnToNexus}
                title="Return to Nexus Landing Page"
              >
                <Layers size={14} /> <span>NEXUS</span>
              </button>
              <div className="assistant-brand-tag">JARVIS <span style={{ opacity: 0.5 }}>// INTELLIGENCE</span></div>
            </div>

            <div className="assistant-header-center">
              <div className="assistant-mobile-segmented-tab">
                <button 
                  type="button" 
                  className={mobileTab === 'chat' ? 'is-active' : ''}
                  onClick={() => setMobileTab('chat')}
                >
                  <Radio size={13} /> <span>Core & Chat</span>
                </button>
                <button 
                  type="button" 
                  className={mobileTab === 'telemetry' ? 'is-active' : ''}
                  onClick={() => setMobileTab('telemetry')}
                >
                  <Activity size={13} /> <span>Telemetry</span>
                </button>
              </div>

              <div className={`assistant-status-pill state-${state.status}`}>
                <span className="status-indicator-dot" />
                <span className="status-label">{state.status.toUpperCase()}</span>
              </div>
            </div>

            <div className="assistant-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleOpenProfile}
                title="Profile & Settings"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: '#f4f7ff',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <User size={13} />
                <span>{isAdmin ? 'Admin' : (profile?.display_name || 'Profile')}</span>
              </button>
            </div>
          </header>

          <main className="assistant-stage-grid">
            <section className={`assistant-telemetry-pane ${mobileTab === 'telemetry' ? 'is-mobile-active' : ''}`}>
              <div className="assistant-pane-header">
                <div className="assistant-pane-title">
                  <Activity size={15} /> <span>TELEMETRY & INTELLIGENCE</span>
                </div>
                <span className="assistant-comms-count">SYSTEM 2.5</span>
              </div>

              <div className="assistant-telemetry-scroll-area">
                <DataPanel data={dashboardData} status={state.status} />
              </div>
            </section>

            <section className={`assistant-main-chat-pane ${mobileTab === 'chat' ? 'is-mobile-active' : ''}`}>
              <div className="assistant-core-stage-wrapper">
                <div className="assistant-orb-container">
                  <InfinityCore state={state.status} />
                </div>
                <div className={`status-text state-${state.status}`}>
                  <div className="status-main">{state.mainText || "SYSTEM ACTIVE"}</div>
                  {state.subText && <div className="status-sub">{state.subText}</div>}
                </div>
              </div>

              <div className="assistant-chat-stream-window">
                <ChatPanel history={chatHistory} theme="default" />
              </div>

              <div className="assistant-terminal-bar">
                <span className="command-prompt">&gt;</span>
                <input 
                  type="text" 
                  className="command-input" 
                  placeholder="Ask Jarvis anything or speak directive..." 
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commandText.trim()) {
                      sendCommand(commandText);
                    }
                  }}
                />
                <button 
                  type="button"
                  className="assistant-send-btn"
                  disabled={!commandText.trim()}
                  onClick={() => {
                    if (commandText.trim()) {
                      sendCommand(commandText);
                    }
                  }}
                  title="Send Command"
                >
                  <Send size={15} />
                </button>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* Landing Page Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Profile Management View */}
      {isProfileOpen && (
        <ProfileView onClose={() => setIsProfileOpen(false)} />
      )}

      {/* Authentication and Onboarding Modals */}
      <AuthModal />
      <OnboardingSurvey />

      {/* Global Curiosity Orb & Dashboard Modal */}
      {isNexusHubActive && !isCuriosityDashboardOpen && (
        <CuriosityOrb 
          hooks={curiosityHooks} 
          onOpenDashboard={handleOpenCuriosity}
          onLaunchCuriosity={handleLaunchCuriosity}
          onSelectHook={handleLaunchCuriosity}
        />
      )}

      {isCuriosityDashboardOpen && (
        <CuriosityDashboard
          hooks={curiosityHooks}
          onClose={handleCloseCuriosity}
          onLaunchCuriosity={handleLaunchCuriosity}
          onSelectHook={handleLaunchCuriosity}
        />
      )}

      {/* NEXUS Main Landing Experience */}
      <NexusHubModal 
        isActive={isNexusHubActive}
        isOpen={isNexusHubActive}
        onLaunchMode={handleLaunchMode}
        onLaunchCuriosity={handleLaunchCuriosity}
        curiosityHooks={curiosityHooks}
        onOpenCuriosityDashboard={handleOpenCuriosity}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenProfile={handleOpenProfile}
        user={user}
        profile={profile}
        isAdmin={isAdmin}
      />

      {/* Full-Screen Workspaces */}
      <AnimatePresence>
        {isProfessorModeActive && (
          <ProfessorMode 
            initialQuestion={curiosityQuestion}
            onExit={handleReturnToNexus} 
          />
        )}
        {isStudyGroupModeActive && (
          <StudyGroupMode 
            onExit={handleReturnToNexus} 
          />
        )}
        {isArchitectModeActive && (
          <ArchitectMode 
            onExit={handleReturnToNexus} 
          />
        )}
        {isSandboxModeActive && (
          <SandboxMode 
            onExit={handleReturnToNexus} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
