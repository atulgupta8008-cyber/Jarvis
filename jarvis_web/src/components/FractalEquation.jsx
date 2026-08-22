import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp, Sparkles, Layers } from 'lucide-react';

// Standard Greek variables used in physics and mathematics
const GREEK_VARS = [
  '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon', '\\zeta', '\\eta', '\\theta', '\\vartheta', 
  '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\varpi', '\\rho', '\\varrho', '\\sigma', '\\varsigma', 
  '\\tau', '\\upsilon', '\\phi', '\\varphi', '\\chi', '\\psi', '\\omega', 
  '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega', '\\hbar'
];

// LaTeX non-variable commands to strip during variable extraction
const NON_VAR_LATEX = new Set([
  '\\frac', '\\dfrac', '\\tfrac', '\\cdot', '\\times', '\\div', '\\pm', '\\mp', '\\sqrt', '\\partial',
  '\\int', '\\iint', '\\iiint', '\\oint', '\\sum', '\\prod', '\\lim', '\\infty',
  '\\sin', '\\cos', '\\tan', '\\sec', '\\csc', '\\cot', '\\arcsin', '\\arccos', '\\arctan',
  '\\sinh', '\\cosh', '\\tanh', '\\log', '\\ln', '\\exp', '\\det', '\\dim', '\\ker',
  '\\propto', '\\approx', '\\equiv', '\\sim', '\\le', '\\ge', '\\leq', '\\geq', '\\neq',
  '\\in', '\\notin', '\\subset', '\\subseteq', '\\to', '\\rightarrow', '\\Rightarrow', '\\implies',
  '\\left', '\\right', '\\begin', '\\end', '\\quad', '\\qquad', '\\newline', '\\nabla',
  '\\vec', '\\hat', '\\bar', '\\tilde', '\\dot', '\\ddot', '\\mathbf', '\\mathcal', '\\mathbb'
]);

/**
 * Renders a single math symbol inside target buttons using KaTeX
 */
function MathSymbol({ symbol }) {
  const symbolRef = useRef(null);

  useEffect(() => {
    if (!symbolRef.current) return;
    try {
      katex.render(symbol, symbolRef.current, {
        throwOnError: false,
        displayMode: false
      });
    } catch {
      symbolRef.current.innerText = symbol;
    }
  }, [symbol]);

  return <span ref={symbolRef} style={{ display: 'inline-block', lineHeight: 1 }} />;
}

/**
 * Parses raw derivation text into structured, individual steps
 */
function parseDerivationSteps(rawStr) {
  if (!rawStr) return [];
  let clean = rawStr.replace(/```(?:latex|math)?/gi, '').replace(/```/g, '').trim();

  // Pattern to detect steps like "Step 1:", "Step 2.", "1.", "2.", "Phase 1:", etc.
  const stepHeaderRegex = /(?:^|\n+|\s{2,})(?:Step\s*(\d+)|(\d+)\.|\b(\d+)\))\s*[:.]?\s*/gi;
  const matches = [...clean.matchAll(stepHeaderRegex)];

  if (matches.length >= 2) {
    const steps = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const stepNum = match[1] || match[2] || match[3] || (i + 1);
      const startIndex = match.index + match[0].length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : clean.length;

      const rawStepContent = clean.slice(startIndex, endIndex).trim();
      if (!rawStepContent) continue;

      const lines = rawStepContent.split(/\n+/).map(l => l.trim()).filter(Boolean);
      let title = '';
      let mathLines = [];
      let notes = [];

      for (let j = 0; j < lines.length; j++) {
        let line = lines[j];

        // First line title detection (e.g. "Sp3 in Diamond:")
        if (j === 0 && line.includes(':') && !line.startsWith('\\')) {
          const colonIdx = line.indexOf(':');
          const possibleTitle = line.substring(0, colonIdx).replace(/\$[^$]*\$/g, '').trim();
          const rest = line.substring(colonIdx + 1).trim();
          if (possibleTitle.length < 60 && /[a-zA-Z]{3,}/.test(possibleTitle)) {
            title = possibleTitle;
            line = rest;
          }
        }

        if (!line) continue;

        // If line is parenthesized context, keep as note
        if (line.startsWith('(') && line.endsWith(')') && !/[=+\\^]/.test(line)) {
          notes.push(line);
        } else {
          mathLines.push(line);
        }
      }

      steps.push({
        stepNum: parseInt(stepNum, 10) || (i + 1),
        title: title || `Step ${stepNum}`,
        mathContent: mathLines.join(' \\\\\n'),
        notes: notes.join(' ')
      });
    }
    return steps;
  }

  // Single equation or non-step derivation
  return [{
    stepNum: 1,
    title: '',
    mathContent: clean,
    notes: ''
  }];
}

/**
 * Formats math content for KaTeX rendering inside a step card
 */
function formatStepMathForKaTeX(mathContent) {
  if (!mathContent) return '';
  let s = mathContent.trim();

  // If already an aligned environment, return clean
  if (s.includes('\\begin{aligned}') || s.includes('\\begin{matrix}')) {
    return s;
  }

  // Wrap unescaped parenthetical English remarks in \text{}
  s = s.replace(/(?<!\\text\{)\(([A-Za-z\s,.\-–—]+?)\)/g, '\\text{ ($1)}');

  // If multi-line math statements, align them cleanly
  if (s.includes('\\\\') || s.includes('\n')) {
    const lines = s.split(/(?:\\\\|\n)/).map(l => l.trim()).filter(Boolean);
    const formattedLines = lines.map(line => {
      if (line.includes('&')) return line;
      if (line.includes('=')) {
        return line.replace('=', '&= ');
      }
      if (line.includes('\\approx')) {
        return line.replace('\\approx', '&\\approx ');
      }
      if (line.includes('\\rightarrow') || line.includes('\\to')) {
        return line.replace(/\\(?:rightarrow|to)/, '&\\to ');
      }
      if (line.includes('\\propto')) {
        return line.replace('\\propto', '&\\propto ');
      }
      if (line.includes('\\implies')) {
        return line.replace('\\implies', '&\\implies ');
      }
      return `& ${line}`;
    });
    return `\\begin{aligned}\n${formattedLines.join(' \\\\\n')}\n\\end{aligned}`;
  }

  return s;
}

/**
 * Individual Step Display Component with Responsive Math Viewport
 */
function DerivationStepBlock({ step, isSingleStep }) {
  const mathRef = useRef(null);
  const [hasError, setHasError] = useState(false);

  const formattedMath = useMemo(() => {
    return formatStepMathForKaTeX(step.mathContent);
  }, [step.mathContent]);

  useEffect(() => {
    if (!mathRef.current) return;
    try {
      katex.render(formattedMath, mathRef.current, {
        throwOnError: false,
        displayMode: true
      });

      if (mathRef.current.querySelector('.katex-error')) {
        setHasError(true);
      } else {
        setHasError(false);
      }
    } catch {
      setHasError(true);
    }
  }, [formattedMath]);

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: isSingleStep ? 'transparent' : 'rgba(255, 255, 255, 0.025)',
        border: isSingleStep ? 'none' : '1px solid rgba(0, 243, 255, 0.18)',
        borderRadius: '12px',
        padding: isSingleStep ? '4px 0' : '12px 14px',
        marginBottom: isSingleStep ? 0 : '10px',
        boxShadow: isSingleStep ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {/* Step Header Badge & Title */}
      {!isSingleStep && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.68rem',
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '0.08em',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, rgba(0, 243, 255, 0.2) 0%, rgba(166, 124, 255, 0.2) 100%)',
            color: '#6ef6f7',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            fontWeight: 700
          }}>
            STEP {step.stepNum < 10 ? `0${step.stepNum}` : step.stepNum}
          </span>
          {step.title && (
            <span style={{
              fontSize: '0.85rem',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: '#e2e8f0',
              letterSpacing: '-0.01em'
            }}>
              {step.title}
            </span>
          )}
        </div>
      )}

      {/* KaTeX Math Viewport (Zero-clipping horizontal touch scroll) */}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        textAlign: 'center',
        padding: '6px 2px'
      }}>
        {!hasError ? (
          <div
            ref={mathRef}
            style={{
              display: 'inline-block',
              minWidth: 'min-content',
              maxWidth: '100%',
              fontSize: 'clamp(0.9rem, 3.2vw, 1.12rem)',
              color: '#ffffff',
              lineHeight: 1.5
            }}
          />
        ) : (
          <div style={{
            fontSize: '0.88rem',
            color: '#e2e8f0',
            fontFamily: 'Fira Code, monospace',
            textAlign: 'left',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            padding: '4px'
          }}>
            {step.mathContent}
          </div>
        )}
      </div>

      {/* Context Notes if present */}
      {step.notes && (
        <div style={{
          fontSize: '0.78rem',
          color: 'rgba(255, 255, 255, 0.65)',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.4,
          borderLeft: '2px solid rgba(0, 243, 255, 0.4)',
          paddingLeft: '8px',
          marginTop: '2px'
        }}>
          {step.notes}
        </div>
      )}
    </div>
  );
}

/**
 * Extracts ONLY genuine physical/mathematical target variables from the equation
 */
function extractVariables(latexStr) {
  if (!latexStr) return [];

  // 1. Strip markdown fences and \text{...}, \mathrm{...}
  let s = latexStr.replace(/```(?:latex|math)?/gi, '').replace(/```/g, '');
  s = s.replace(/\\(?:text|mathrm|textbf|mathit|operatorname)\s*\{[^}]*\}/g, ' ');

  // 2. Strip possessives like 's and punctuation attached to words
  s = s.replace(/'s\b/gi, ' ');
  s = s.replace(/'[a-zA-Z]\b/g, ' ');

  // 3. Transform differentials like dp, dt, dx, dv, dq, dm, dr, dE -> keep the variable
  s = s.replace(/\bd([a-zA-Z])\b/g, '$1');
  s = s.replace(/\\mathrm\{d\}([a-zA-Z])/g, '$1');
  s = s.replace(/\\partial\s*([a-zA-Z])/g, '$1');

  // 4. Remove all multi-letter English words (e.g. Newton, Second, Law, Define, Momentum)
  s = s.replace(/(?<!\\)\b[A-Za-z]{2,}\b/g, ' ');

  // 5. Filter LaTeX commands
  s = s.replace(/\\[a-zA-Z]+/g, (cmd) => {
    if (GREEK_VARS.includes(cmd)) return cmd;
    if (NON_VAR_LATEX.has(cmd)) return ' ';
    return ' ';
  });

  // 6. Match variables: Greek letter or single Latin letter, optionally with subscript
  const varRegex = /(?:\\(?:[a-zA-Z]+)|[a-zA-Z])(?:_[a-zA-Z0-9]+|_{[^}]+})?/g;
  const matches = s.match(varRegex) || [];

  const ignoreList = new Set(['d', 'dt', 'dx', 'dy', 'dz', 'dp', 'dv', 'dq', 'dr', 'ds', 'dm', 'dE', 'i']);
  const result = [];
  const seen = new Set();

  for (let raw of matches) {
    const v = raw.trim();
    if (!v || /^[0-9]+$/.test(v)) continue;
    if (ignoreList.has(v) && !v.includes('_') && !v.startsWith('\\')) continue;
    if (!seen.has(v)) {
      seen.add(v);
      result.push(v);
    }
  }

  return result.slice(0, 8);
}

export default function FractalEquation({ node, onVariableClick }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const steps = useMemo(() => {
    return parseDerivationSteps(node.equation || '');
  }, [node.equation]);

  const variables = useMemo(() => {
    return extractVariables(node.equation || '');
  }, [node.equation]);

  const isMultiStep = steps.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        margin: '8px 0',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Equation Main Card */}
      <div
        style={{
          background: 'rgba(15, 20, 35, 0.88)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: '0 8px 32px 0 rgba(0, 243, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px'
        }}
      >
        {/* Card Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isMultiStep ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          paddingBottom: isMultiStep ? '8px' : '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6ef6f7', fontSize: '0.72rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' }}>
            <Layers size={13} />
            {isMultiStep ? `DERIVATION (${steps.length} PHASES)` : 'FRACTAL EQUATION'}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? "Expand" : "Collapse"}
            onMouseOver={(e) => e.currentTarget.style.color = 'rgba(0, 243, 255, 0.9)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Step-by-Step Derivation Flow */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '6px'
        }}>
          {steps.map((step, idx) => (
            <DerivationStepBlock
              key={idx}
              step={step}
              isSingleStep={!isMultiStep}
            />
          ))}
        </div>

        {/* Explanation & Interactive Targets inside Collapsible Area */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}
            >
              {/* Explanation text if present */}
              {node.explanation && (
                <div style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                  maxWidth: '560px',
                  lineHeight: 1.45,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '8px'
                }}>
                  {node.explanation}
                </div>
              )}

              {/* Interactive Target Tokens */}
              {variables.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '4px',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    color: '#00f3ff', 
                    fontFamily: 'Orbitron, sans-serif', 
                    letterSpacing: '0.08em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Sparkles size={11} /> TARGETS:
                  </span>
                  {variables.map((varName, idx) => {
                    const isLoading = node.loadingVariable === varName;
                    return (
                      <button
                        key={idx}
                        onClick={() => onVariableClick(varName, node.id)}
                        disabled={isLoading}
                        style={{
                          background: isLoading ? 'rgba(0, 243, 255, 0.3)' : 'rgba(0, 243, 255, 0.1)',
                          border: '1px solid rgba(0, 243, 255, 0.4)',
                          color: '#00f3ff',
                          padding: '4px 10px',
                          borderRadius: '10px',
                          cursor: isLoading ? 'wait' : 'pointer',
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.86rem',
                          fontWeight: 600,
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 0 8px rgba(0, 243, 255, 0.15)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.background = 'rgba(0, 243, 255, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 243, 255, 0.4)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.background = 'rgba(0, 243, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 243, 255, 0.15)';
                          }
                        }}
                      >
                        <MathSymbol symbol={varName} />
                        {isLoading && <span style={{ animation: 'spin 1s linear infinite', fontSize: '10px' }}>🌀</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Child Nodes Connected by Glowing Line */}
      <AnimatePresence>
        {!isCollapsed && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}
          >
            {node.children.map((childNode) => (
              <div key={childNode.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* Vertical Glowing Connector Line */}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 26, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '2px',
                    height: '26px',
                    background: 'linear-gradient(to bottom, #00f3ff, #a67cff)',
                    boxShadow: '0 0 10px #00f3ff',
                    margin: '2px 0'
                  }}
                />
                
                {/* Recursive Child Equation */}
                <FractalEquation
                  node={childNode}
                  context={childNode.equation}
                  onVariableClick={onVariableClick}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
