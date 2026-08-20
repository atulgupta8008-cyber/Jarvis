import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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
  '\\in', '\\notin', '\\subset', '\\subseteq', '\\to', '\\rightarrow', '\\Rightarrow',
  '\\left', '\\right', '\\begin', '\\end', '\\quad', '\\qquad', '\\newline', '\\nabla',
  '\\vec', '\\hat', '\\bar', '\\tilde', '\\dot', '\\ddot', '\\mathbf', '\\mathcal', '\\mathbb'
]);

/**
 * Renders a single math symbol inside buttons using KaTeX
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
 * Intelligent LaTeX Sanitizer & Multi-line Formatter for KaTeX
 */
function formatLatexForKaTeX(rawStr) {
  if (!rawStr) return '';
  let clean = rawStr.replace(/```(?:latex|math)?/gi, '').replace(/```/g, '').trim();

  // If already a clean aligned or equation environment, check if it renders
  if (clean.includes('\\begin{aligned}') || clean.includes('\\begin{matrix}')) {
    return clean;
  }

  // Check if string contains numbered steps (e.g. "1. ... 2. ... 3. ...")
  const stepSplitRegex = /(?:^|\s+)(?=\d+\.\s+|Step\s*\d+:)/i;
  const segments = clean.split(stepSplitRegex).map(s => s.trim()).filter(Boolean);

  if (segments.length > 1) {
    const formattedLines = segments.map((seg) => {
      // Extract step label e.g. "1. Define momentum ($p$):" or "2. Newton's Second Law:"
      const match = seg.match(/^(\d+\.|\bStep\s*\d+:?)\s*([^:]+?)(?::|=|\s+(?=[a-zA-Z]\s*=))(.*)$/i);
      if (match) {
        let num = match[1];
        let label = match[2].replace(/\$[^$]*\$/g, '').trim();
        label = label.replace(/[()]/g, '').trim();
        let mathPart = (match[3] || '').trim();
        mathPart = mathPart.replace(/^[:=]\s*/, '').trim();
        mathPart = mathPart.replace(/^\$+|\$+$/g, '').trim();
        if (!mathPart) mathPart = seg;
        
        return `\\text{${num} ${label}: } & ${mathPart}`;
      } else {
        const parts = seg.split(/[:=]/);
        if (parts.length > 1) {
          const txt = parts[0].trim();
          const math = parts.slice(1).join('=').trim().replace(/^\$+|\$+$/g, '');
          return `\\text{${txt}: } & ${math}`;
        }
        return `& ${seg}`;
      }
    });

    return `\\begin{aligned}\n${formattedLines.join(' \\\\\n')}\n\\end{aligned}`;
  }

  // If plain text with single formula
  if (clean.includes(':') && !clean.includes('\\text{')) {
    const [label, ...rest] = clean.split(':');
    const math = rest.join(':').trim().replace(/^\$+|\$+$/g, '');
    if (math) {
      return `\\text{${label.trim()}: } ${math}`;
    }
  }

  return clean;
}

/**
 * Extracts ONLY genuine physical/mathematical target variables from a formula.
 * Eliminates all English words, function names, operators, punctuation, numbers, and garbage.
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

  // Return at most 6 to 8 prioritized variables
  return result.slice(0, 8);
}

export default function FractalEquation({ node, onVariableClick }) {
  const containerRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const variables = extractVariables(node.equation);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const formatted = formatLatexForKaTeX(node.equation || '');
      katex.render(formatted, containerRef.current, {
        throwOnError: false,
        displayMode: true
      });

      // Check if KaTeX generated an error element
      if (containerRef.current.querySelector('.katex-error')) {
        setRenderError(true);
      } else {
        setRenderError(false);
      }
    } catch {
      setRenderError(true);
    }
  }, [node.equation]);

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
        margin: '12px 0',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Equation Block */}
      <div
        style={{
          background: 'rgba(15, 20, 35, 0.85)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '16px',
          padding: '16px 24px',
          boxShadow: '0 8px 32px 0 rgba(0, 243, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          paddingTop: '24px'
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          title={isCollapsed ? "Expand" : "Collapse"}
          onMouseOver={(e) => e.currentTarget.style.color = 'rgba(0, 243, 255, 0.8)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {/* Rendered Math Formula */}
        <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px', display: 'flex', justifyContent: 'center' }}>
          {!renderError ? (
            <div ref={containerRef} style={{ fontSize: '1.15rem', color: '#ffffff', minHeight: '30px' }} />
          ) : (
            <div style={{ 
              fontSize: '0.95rem', 
              color: '#e2e8f0', 
              fontFamily: 'Fira Code, monospace', 
              textAlign: 'center',
              lineHeight: 1.6,
              padding: '4px 8px'
            }}>
              {node.equation}
            </div>
          )}
        </div>

        {/* Explanation and Variables inside AnimatePresence */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}
            >
              {/* Explanation text if present */}
              {node.explanation && (
                <div style={{
                  fontSize: '0.84rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                  maxWidth: '520px',
                  lineHeight: 1.45,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '10px'
                }}>
                  {node.explanation}
                </div>
              )}

              {/* Interactive Variable Tokens */}
              {variables.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px', justifyContent: 'center' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    color: '#00f3ff', 
                    fontFamily: 'Orbitron, sans-serif', 
                    letterSpacing: '1px',
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
                          background: isLoading ? 'rgba(0, 243, 255, 0.3)' : 'rgba(0, 243, 255, 0.12)',
                          border: '1px solid rgba(0, 243, 255, 0.45)',
                          color: '#00f3ff',
                          padding: '5px 12px',
                          borderRadius: '12px',
                          cursor: isLoading ? 'wait' : 'pointer',
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseOver={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.background = 'rgba(0, 243, 255, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 243, 255, 0.4)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isLoading) {
                            e.currentTarget.style.background = 'rgba(0, 243, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 243, 255, 0.2)';
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
                  animate={{ height: 30, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '2px',
                    height: '30px',
                    background: 'linear-gradient(to bottom, #00f3ff, #a67cff)',
                    boxShadow: '0 0 10px #00f3ff',
                    margin: '4px 0'
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
