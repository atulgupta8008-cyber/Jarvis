import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FractalEquation({ node, onVariableClick }) {
  const containerRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  // Helper to extract clickable variable symbols from LaTeX
  const extractVariables = (latexStr) => {
    if (!latexStr) return [];
    
    // 1. Remove text blocks like \text{...}, \mathrm{...}
    let cleanStr = latexStr.replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{[^}]*\}/g, ' ');
    
    // 2. Remove words that are just typed out (like 'constant')
    cleanStr = cleanStr.replace(/constant/gi, ' ');

    // 3. Remove specific non-variable LaTeX commands
    cleanStr = cleanStr.replace(/\\[a-zA-Z]+/g, (match) => {
      const allowedGreek = [
        '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon', '\\zeta', '\\eta', '\\theta', '\\vartheta', 
        '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\varpi', '\\rho', '\\varrho', '\\sigma', '\\varsigma', 
        '\\tau', '\\upsilon', '\\phi', '\\varphi', '\\chi', '\\psi', '\\omega', 
        '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega'
      ];
      return allowedGreek.includes(match) ? match : ' ';
    });

    // 4. Match variable patterns: 
    // - Greek letter (e.g. \alpha) or single Latin letter (a-zA-Z)
    // - Optionally followed by subscript _x or _{xxx}
    const regex = /(?:\\[a-zA-Z]+|[a-zA-Z])(?:_[a-zA-Z0-9]+|_{[^}]+})?/g;
    
    const matches = cleanStr.match(regex) || [];
    
    return Array.from(new Set(matches.filter(v => v.trim().length > 0)));
  };

  const variables = extractVariables(node.equation);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      let cleanContent = node.equation || '';
      cleanContent = cleanContent.replace(/```latex/gi, '').replace(/```math/gi, '').replace(/```/g, '').trim();
      katex.render(cleanContent, containerRef.current, {
        throwOnError: false,
        displayMode: true
      });
    } catch {
      containerRef.current.innerText = node.equation;
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
          paddingTop: '24px' // Always make room for toggle since targets might exist
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
          <div ref={containerRef} style={{ fontSize: '1.2rem', color: '#ffffff', minHeight: '30px' }} />
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
                  fontSize: '0.82rem',
                  color: 'rgba(255, 255, 255, 0.75)',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                  maxWidth: '400px',
                  lineHeight: 1.4,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '8px'
                }}>
                  {node.explanation}
                </div>
              )}

              {/* Interactive Variable Tokens */}
              {variables.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#00f3ff', fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>
                    TARGETS:
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
                          borderRadius: '12px',
                          cursor: isLoading ? 'wait' : 'pointer',
                          fontFamily: 'Fira Code, monospace',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 0 8px rgba(0, 243, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {varName}
                        {isLoading && <span style={{ animation: 'spin 1s linear infinite' }}>🌀</span>}
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
