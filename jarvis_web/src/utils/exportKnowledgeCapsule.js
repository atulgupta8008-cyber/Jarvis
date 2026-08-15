/**
 * Export Knowledge Capsule Generator
 * Generates an interactive, standalone HTML & print-ready PDF summary of a Socratic learning session.
 */

export function exportKnowledgeCapsule({
  title = "Socratic Learning Session",
  mode = "professor",
  chatHistory = [],
  blackboardWidgets = [],
  sessionMedia = [],
  teachingScore = null
}) {
  const timestamp = new Date().toLocaleString();
  const dateSlug = new Date().toISOString().slice(0, 10);
  const cleanTitle = (title || "Socratic_Session").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Jarvis_Knowledge_Capsule_${cleanTitle}_${dateSlug}.html`;

  // Calculate statistics
  const userMessages = chatHistory.filter(m => m.role === 'user' || m.role === 'You');
  const aiMessages = chatHistory.filter(m => m.role !== 'user' && m.role !== 'You');
  const mathWidgets = blackboardWidgets.filter(w => w.type === 'math');
  const diagramWidgets = blackboardWidgets.filter(w => w.type === 'diagram');
  const simulationWidgets = blackboardWidgets.filter(w => w.type === 'simulation');

  // Format mode display name
  let modeDisplayName = "Socratic Professor Mode";
  if (mode === "architect") modeDisplayName = "Architect Mode (Systems Thinking)";
  else if (mode === "study_group" || mode === "study-group") modeDisplayName = "Study Group (AI Debate Panel)";
  else if (mode === "sandbox") modeDisplayName = "Physics Sandbox";

  // Build HTML document
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Knowledge Capsule // ${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
  
  <style>
    :root {
      --bg: #05070d;
      --card-bg: rgba(255, 255, 255, 0.03);
      --border: rgba(255, 255, 255, 0.1);
      --cyan: #6ef6f7;
      --violet: #a996ff;
      --emerald: #34d399;
      --amber: #ffd165;
      --text: #f4f7ff;
      --muted: #8e9bb9;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      padding: 40px 20px;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
    }

    /* Action bar */
    .action-bar {
      position: sticky;
      top: 20px;
      z-index: 100;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 30px;
    }

    .btn {
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: var(--cyan);
      color: #030508;
      border-color: var(--cyan);
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    /* Header */
    .capsule-header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 30px;
      margin-bottom: 40px;
    }

    .brand-badge {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.15em;
      color: var(--cyan);
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    h1 {
      font-family: 'Syne', sans-serif;
      font-size: 2.8rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
      color: #fff;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 24px;
      padding: 20px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-family: 'DM Mono', monospace;
      font-size: 12px;
    }

    .meta-item span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }

    /* Section Styling */
    .section {
      margin-bottom: 50px;
    }

    .section-title {
      font-family: 'DM Mono', monospace;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--violet);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: '◆';
      color: var(--cyan);
    }

    /* Media List */
    .media-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
    }

    .media-chip {
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      padding: 8px 16px;
      background: rgba(110, 246, 247, 0.05);
      border: 1px solid rgba(110, 246, 247, 0.2);
      color: var(--cyan);
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Dialogue */
    .dialogue-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message {
      padding: 20px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      position: relative;
    }

    .message.user {
      border-left: 3px solid var(--cyan);
      background: rgba(110, 246, 247, 0.02);
    }

    .message.jarvis {
      border-left: 3px solid var(--violet);
      background: rgba(169, 150, 255, 0.02);
    }

    .message.young_jarvis {
      border-left: 3px solid var(--amber);
      background: rgba(255, 209, 101, 0.02);
    }

    .message.vance {
      border-left: 3px solid #ff4500;
      background: rgba(255, 69, 0, 0.03);
    }

    .message.ada {
      border-left: 3px solid #32cd32;
      background: rgba(50, 205, 50, 0.03);
    }

    .role-badge {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
      display: inline-block;
    }

    .message.user .role-badge { color: var(--cyan); }
    .message.jarvis .role-badge { color: var(--violet); }
    .message.young_jarvis .role-badge { color: var(--amber); }
    .message.vance .role-badge { color: #ff4500; }
    .message.ada .role-badge { color: #32cd32; }

    .message-content {
      font-size: 15px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Blackboard Artifacts */
    .widget-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .widget-card {
      padding: 24px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--card-bg);
    }

    .widget-type {
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      color: var(--cyan);
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .widget-math {
      font-size: 18px;
      text-align: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      overflow-x: auto;
    }

    /* Score Card */
    .score-box {
      padding: 24px;
      border-radius: 14px;
      border: 1px solid rgba(255, 209, 101, 0.3);
      background: rgba(255, 209, 101, 0.03);
      text-align: center;
    }

    .score-values {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin: 20px 0;
    }

    .score-circle {
      font-family: 'Syne', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--amber);
    }

    .score-circle span {
      display: block;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
    }

    /* Footer */
    .capsule-footer {
      border-top: 1px solid var(--border);
      padding-top: 30px;
      text-align: center;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      color: var(--muted);
    }

    /* Print Stylesheet */
    @media print {
      body {
        background: #fff !important;
        color: #000 !important;
        padding: 0 !important;
      }
      .action-bar { display: none !important; }
      .container { max-width: 100% !important; }
      .message {
        border: 1px solid #ddd !important;
        background: #fafafa !important;
        color: #000 !important;
        page-break-inside: avoid;
      }
      .message-content { color: #111 !important; }
      .meta-grid, .widget-card, .score-box {
        border: 1px solid #ccc !important;
        background: #f8f9fa !important;
        color: #000 !important;
      }
      .role-badge, .section-title, .brand-badge {
        color: #000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Floating Action Bar -->
    <div class="action-bar">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <!-- Capsule Header -->
    <header class="capsule-header">
      <div class="brand-badge">JARVIS // OS · KNOWLEDGE CAPSULE</div>
      <h1>${escapeHtml(title)}</h1>
      <p style="color: var(--muted); font-size: 16px;">Comprehensive Socratic derivation, transcript, and cognitive artifacts archive.</p>

      <div class="meta-grid">
        <div class="meta-item">
          <span>Mode</span>
          ${escapeHtml(modeDisplayName)}
        </div>
        <div class="meta-item">
          <span>Date Generated</span>
          ${escapeHtml(timestamp)}
        </div>
        <div class="meta-item">
          <span>Dialogue Turns</span>
          ${chatHistory.length} total (${userMessages.length} user / ${aiMessages.length} AI)
        </div>
        <div class="meta-item">
          <span>Blackboard Artifacts</span>
          ${blackboardWidgets.length} items (${mathWidgets.length} derivations, ${diagramWidgets.length} diagrams)
        </div>
      </div>
    </header>

    ${sessionMedia.length > 0 ? `
    <!-- Session Media Vault -->
    <section class="section">
      <div class="section-title">Course Materials & Referenced Documents</div>
      <div class="media-list">
        ${sessionMedia.map(m => `
          <div class="media-chip">
            📄 <strong>${escapeHtml(m.name || 'Document')}</strong> (${formatBytes(m.size || 0)})
          </div>
        `).join('')}
      </div>
    </section>
    ` : ''}

    ${teachingScore ? `
    <!-- Teaching Evaluation Score -->
    <section class="section">
      <div class="section-title">Teaching Performance Scorecard</div>
      <div class="score-box">
        <div class="score-values">
          <div class="score-circle">${teachingScore.clarity || 0}<span>Clarity</span></div>
          <div class="score-circle">${teachingScore.accuracy || 0}<span>Accuracy</span></div>
          <div class="score-circle">${teachingScore.intuition || 0}<span>Intuition</span></div>
        </div>
        ${teachingScore.feedback ? `<p style="font-style: italic; color: var(--text);">"${escapeHtml(teachingScore.feedback)}"</p>` : ''}
      </div>
    </section>
    ` : ''}

    ${blackboardWidgets.length > 0 ? `
    <!-- Blackboard Derivations & Artifacts -->
    <section class="section">
      <div class="section-title">Blackboard Mathematical Derivations & Artifacts</div>
      <div class="widget-grid">
        ${blackboardWidgets.map((w, idx) => `
          <div class="widget-card">
            <div class="widget-type">${escapeHtml(w.type === 'math' ? 'Mathematical Derivation (LaTeX)' : w.type === 'diagram' ? 'Architecture Diagram (Mermaid)' : 'Simulation Data')} · Node #${idx + 1}</div>
            ${w.type === 'math' ? `
              <div class="widget-math">$$${escapeHtml(w.content)}$$</div>
            ` : `
              <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; font-family: 'DM Mono'; font-size: 13px; overflow-x: auto; color: var(--text);">${escapeHtml(w.content)}</pre>
            `}
          </div>
        `).join('')}
      </div>
    </section>
    ` : ''}

    <!-- Socratic Dialogue Transcript -->
    <section class="section">
      <div class="section-title">Socratic Dialogue Transcript</div>
      <div class="dialogue-list">
        ${chatHistory.map((m) => {
          const roleName = m.role === 'user' || m.role === 'You' ? 'You' :
                           m.role === 'vance' ? 'Dr. Vance' :
                           m.role === 'ada' ? 'Ada' :
                           m.role === 'young_jarvis' ? 'Young Jarvis (AI Student)' : 'Jarvis (Socratic Professor)';
          const roleClass = m.role === 'user' || m.role === 'You' ? 'user' : m.role;
          return `
            <div class="message ${roleClass}">
              <div class="role-badge">${escapeHtml(roleName)}</div>
              <div class="message-content">${escapeHtml(m.message)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- Capsule Footer -->
    <footer class="capsule-footer">
      <p>Generated by Jarvis // Cognitive Learning Operating System · ${new Date().getFullYear()}</p>
    </footer>
  </div>
</body>
</html>`;

  // Trigger browser download of the standalone HTML capsule
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
