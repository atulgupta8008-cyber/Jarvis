import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, MessageSquare, Clock, Shield, Search,
  ChevronRight, BookOpen, Zap, FlaskConical, Layers, Cpu,
  Mail, GraduationCap, Globe, Sparkles, User, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import FormattedMessage from './FormattedMessage';
import './AdminDashboard.css';

const ADMIN_KEY = localStorage.getItem('jarvis_admin_key') || 'jarvis-admin-777';

const MODE_CONFIG = {
  professor:    { label: 'Professor',    icon: BookOpen,     cls: 'mode-professor' },
  architect:    { label: 'Architect',    icon: Zap,          cls: 'mode-architect' },
  study_group:  { label: 'Study Group',  icon: Users,        cls: 'mode-study_group' },
  sandbox:      { label: 'Sandbox',      icon: FlaskConical, cls: 'mode-sandbox' },
  assistant:    { label: 'Assistant',    icon: Cpu,          cls: 'mode-assistant' },
};

const ROLE_COLORS = {
  user:         '#6ef6f7',
  jarvis:       '#a996ff',
  young_jarvis: '#ffd165',
  vance:        '#ff9db8',
  ada:          '#34d399',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function formatRoleLabel(role) {
  const labels = {
    user: 'Student', jarvis: 'Professor Jarvis', young_jarvis: 'Young Jarvis',
    vance: 'Dr. Vance', ada: 'Ada'
  };
  return labels[role] || role;
}

// ──────────────────────────────────────────────
// LEVEL 1: All Users
// ──────────────────────────────────────────────
function UserListView({ onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/users?admin_key=${encodeURIComponent(ADMIN_KEY)}`);
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data.users || []);
      } catch (e) {
        console.error('[Admin] Error loading users:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.id || '').toLowerCase().includes(q);
  });

  const totalSessions = users.reduce((sum, u) => sum + (u.session_count || 0), 0);

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-pulse" /><span>Loading users...</span></div>;
  }

  return (
    <>
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{users.length}</div>
          <div className="admin-stat-label">Total Users</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ color: '#a996ff' }}>{users.filter(u => u.role === 'admin').length}</div>
          <div className="admin-stat-label">Admins</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ color: '#34d399' }}>{totalSessions}</div>
          <div className="admin-stat-label">Total Sessions</div>
        </div>
      </div>

      <div className="admin-search-bar">
        <Search size={16} className="admin-search-icon" />
        <input
          type="text"
          placeholder="Search users by name, email, or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty-state">
          <Users size={40} />
          <p>{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="hide-mobile">Email</th>
                <th>Role</th>
                <th className="hide-mobile">Education</th>
                <th className="hide-mobile">Language</th>
                <th>Sessions</th>
                <th className="hide-mobile">Joined</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} onClick={() => onSelectUser(user)}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">
                        {(user.display_name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="admin-user-name">{user.display_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="hide-mobile admin-text-muted">{user.email || '—'}</td>
                  <td>
                    <span className={`admin-role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {user.role === 'admin' ? '★ Admin' : 'User'}
                    </span>
                  </td>
                  <td className="hide-mobile admin-text-muted">{user.education_level || '—'}</td>
                  <td className="hide-mobile admin-text-muted">{user.language || '—'}</td>
                  <td>
                    <span className="admin-session-count">{user.session_count || 0}</span>
                  </td>
                  <td className="hide-mobile admin-text-muted">{formatDate(user.created_at)}</td>
                  <td><ChevronRight size={14} className="admin-text-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// LEVEL 2: User's Sessions
// ──────────────────────────────────────────────
function UserSessionsView({ user, onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(user.id)}/sessions?admin_key=${encodeURIComponent(ADMIN_KEY)}`);
        if (!res.ok) throw new Error('Failed to fetch sessions');
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (e) {
        console.error('[Admin] Error loading sessions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user.id]);

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-pulse" /><span>Loading sessions...</span></div>;
  }

  const modeCounts = {};
  sessions.forEach(s => { modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1; });

  return (
    <>
      <div className="admin-user-profile-card">
        <div className="admin-profile-avatar-lg">
          {(user.display_name || 'U')[0].toUpperCase()}
        </div>
        <div className="admin-profile-info">
          <h3>{user.display_name || 'Unknown User'}</h3>
          <div className="admin-profile-meta">
            <span><Mail size={12} /> {user.email || '—'}</span>
            <span><GraduationCap size={12} /> {user.education_level || '—'}</span>
            <span><Globe size={12} /> {user.language || '—'}</span>
            <span><Sparkles size={12} /> {user.learning_style || '—'}</span>
            <span><Calendar size={12} /> Joined {formatDate(user.created_at)}</span>
          </div>
          {user.interested_subjects && (
            <div className="admin-profile-subjects">
              {(Array.isArray(user.interested_subjects) ? user.interested_subjects : []).map(s => (
                <span key={s} className="admin-subject-tag">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{sessions.length}</div>
          <div className="admin-stat-label">Total Sessions</div>
        </div>
        {Object.entries(modeCounts).map(([mode, count]) => {
          const cfg = MODE_CONFIG[mode] || { label: mode, cls: '' };
          return (
            <div className="admin-stat-card" key={mode}>
              <div className="admin-stat-value" style={{ color: mode === 'professor' ? '#6ef6f7' : mode === 'architect' ? '#a996ff' : mode === 'study_group' ? '#34d399' : '#ffd165' }}>
                {count}
              </div>
              <div className="admin-stat-label">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 ? (
        <div className="admin-empty-state">
          <MessageSquare size={40} />
          <p>No sessions found for this user</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Session Title</th>
                <th>Mode</th>
                <th>Messages</th>
                <th className="hide-mobile">Created</th>
                <th className="hide-mobile">Last Active</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => {
                const cfg = MODE_CONFIG[session.mode] || { label: session.mode, cls: '' };
                return (
                  <tr key={session.id} onClick={() => onSelectSession(session)}>
                    <td>
                      <span className="admin-session-title">{session.session_title || 'Untitled Session'}</span>
                    </td>
                    <td>
                      <span className={`admin-mode-badge ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td>
                      <span className="admin-session-count">{session.message_count || 0}</span>
                    </td>
                    <td className="hide-mobile admin-text-muted">{formatDateTime(session.created_at)}</td>
                    <td className="hide-mobile admin-text-muted">{formatDateTime(session.updated_at)}</td>
                    <td><ChevronRight size={14} className="admin-text-muted" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// LEVEL 3: Session Messages (Chat Transcript)
// ──────────────────────────────────────────────
function SessionMessagesView({ session }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/sessions/${encodeURIComponent(session.id)}/messages?admin_key=${encodeURIComponent(ADMIN_KEY)}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) {
        console.error('[Admin] Error loading messages:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [session.id]);

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-pulse" /><span>Loading messages...</span></div>;
  }

  const modeCfg = MODE_CONFIG[session.mode] || { label: session.mode, cls: '' };

  return (
    <>
      <div className="admin-session-header-card">
        <div className="admin-session-header-top">
          <h3>{session.session_title || 'Untitled Session'}</h3>
          <span className={`admin-mode-badge ${modeCfg.cls}`}>{modeCfg.label}</span>
        </div>
        <div className="admin-session-header-meta">
          <span><Clock size={12} /> Created: {formatDateTime(session.created_at)}</span>
          <span><MessageSquare size={12} /> {messages.length} messages</span>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="admin-empty-state">
          <MessageSquare size={40} />
          <p>No messages in this session</p>
        </div>
      ) : (
        <div className="admin-message-list">
          {messages.map((msg, i) => {
            const dotColor = ROLE_COLORS[msg.role] || '#8994ad';
            return (
              <div className="admin-message-item" key={msg.id || i}>
                <div className="admin-message-meta">
                  <div className="admin-message-role">
                    <span className="admin-role-dot" style={{ background: dotColor }} />
                    <span style={{ color: dotColor }}>{formatRoleLabel(msg.role)}</span>
                  </div>
                  <span className="admin-message-time">{formatDateTime(msg.created_at)}</span>
                </div>
                <div className="admin-message-content">
                  <FormattedMessage text={msg.content || ''} />
                </div>
                {msg.teaching_score && (
                  <div className="admin-message-score">
                    <Sparkles size={12} style={{ color: '#ffd165' }} />
                    <span>Teaching Score: </span>
                    {typeof msg.teaching_score === 'object' ? (
                      <>
                        <span className="score-item">Clarity: {msg.teaching_score.clarity}</span>
                        <span className="score-item">Accuracy: {msg.teaching_score.accuracy}</span>
                        <span className="score-item">Intuition: {msg.teaching_score.intuition}</span>
                        {msg.teaching_score.feedback && (
                          <span className="score-feedback">"{msg.teaching_score.feedback}"</span>
                        )}
                      </>
                    ) : (
                      <span>{JSON.stringify(msg.teaching_score)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// MAIN: Admin Dashboard Shell
// ──────────────────────────────────────────────
export default function AdminDashboard({ onExit }) {
  const { isAdmin } = useAuth();
  const [view, setView] = useState('users');           // 'users' | 'sessions' | 'messages'
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const handleSelectUser = useCallback((user) => {
    setSelectedUser(user);
    setView('sessions');
  }, []);

  const handleSelectSession = useCallback((session) => {
    setSelectedSession(session);
    setView('messages');
  }, []);

  const handleBackToUsers = useCallback(() => {
    setView('users');
    setSelectedUser(null);
    setSelectedSession(null);
  }, []);

  const handleBackToSessions = useCallback(() => {
    setView('sessions');
    setSelectedSession(null);
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <motion.div
      className="admin-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={onExit} title="Return to Nexus">
            <ArrowLeft size={15} />
            <span>NEXUS</span>
          </button>
          <div className="admin-title">
            <Shield size={18} style={{ color: '#ffd165' }} />
            <span>Admin Console</span>
          </div>
        </div>
        <div className="admin-header-right">
          <span className="admin-header-tag">NOVANETS // ADMIN</span>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="admin-breadcrumb">
        <span
          className={view === 'users' ? 'admin-breadcrumb-current' : 'admin-breadcrumb-link'}
          onClick={view !== 'users' ? handleBackToUsers : undefined}
        >
          All Users
        </span>
        {(view === 'sessions' || view === 'messages') && selectedUser && (
          <>
            <ChevronRight size={12} />
            <span
              className={view === 'sessions' ? 'admin-breadcrumb-current' : 'admin-breadcrumb-link'}
              onClick={view !== 'sessions' ? handleBackToSessions : undefined}
            >
              {selectedUser.display_name || selectedUser.email || 'User'}
            </span>
          </>
        )}
        {view === 'messages' && selectedSession && (
          <>
            <ChevronRight size={12} />
            <span className="admin-breadcrumb-current">
              {selectedSession.session_title || 'Session'}
            </span>
          </>
        )}
      </nav>

      {/* Content */}
      <main className="admin-content">
        {view === 'users' && <UserListView onSelectUser={handleSelectUser} />}
        {view === 'sessions' && selectedUser && (
          <UserSessionsView user={selectedUser} onSelectSession={handleSelectSession} />
        )}
        {view === 'messages' && selectedSession && (
          <SessionMessagesView session={selectedSession} />
        )}
      </main>
    </motion.div>
  );
}
