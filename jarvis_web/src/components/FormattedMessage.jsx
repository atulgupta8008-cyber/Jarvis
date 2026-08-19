import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Safely renders LaTeX string into HTML via KaTeX
 */
function renderLatex(latex, displayMode = false) {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml'
    });
  } catch (err) {
    return latex;
  }
}

/**
 * Formats inline text with bold, italic, inline code, and inline math
 */
function formatInlineText(text) {
  if (!text) return null;

  // Split by inline math ($...$), bold (**...**), italic (*...*), and code (`...`)
  const tokens = [];
  let remaining = text;

  // Pattern matches:
  // 1. Inline Math: $...$
  // 2. Bold: **...** or __...__
  // 3. Italic: *...* or _..._
  // 4. Inline Code: `...`
  const regex = /(\$[^$\n]+\$|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIdx) {
      tokens.push({ type: 'text', content: text.substring(lastIdx, match.index) });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('$') && matchedStr.endsWith('$') && matchedStr.length > 2) {
      // Inline math
      tokens.push({ type: 'inline_math', content: matchedStr.slice(1, -1) });
    } else if ((matchedStr.startsWith('**') && matchedStr.endsWith('**')) || (matchedStr.startsWith('__') && matchedStr.endsWith('__'))) {
      // Bold
      tokens.push({ type: 'bold', content: matchedStr.slice(2, -2) });
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      // Inline code
      tokens.push({ type: 'code', content: matchedStr.slice(1, -1) });
    } else if ((matchedStr.startsWith('*') && matchedStr.endsWith('*')) || (matchedStr.startsWith('_') && matchedStr.endsWith('_'))) {
      // Italic
      tokens.push({ type: 'italic', content: matchedStr.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', content: matchedStr });
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    tokens.push({ type: 'text', content: text.substring(lastIdx) });
  }

  return tokens.map((token, i) => {
    switch (token.type) {
      case 'inline_math':
        return (
          <span 
            key={i} 
            className="katex-inline"
            dangerouslySetInnerHTML={{ __html: renderLatex(token.content, false) }} 
            style={{ margin: '0 2px' }}
          />
        );
      case 'bold':
        return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{token.content}</strong>;
      case 'italic':
        return <em key={i} style={{ color: '#c8d0e0', fontStyle: 'italic' }}>{token.content}</em>;
      case 'code':
        return (
          <code 
            key={i} 
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.86em',
              color: 'var(--cyan, #6ef6f7)'
            }}
          >
            {token.content}
          </code>
        );
      default:
        return <span key={i}>{token.content}</span>;
    }
  });
}

export default function FormattedMessage({ text = '', isUser = false }) {
  const elements = useMemo(() => {
    if (!text) return null;

    // Split text into blocks (block math $$...$$, code blocks ```...```, headers ###, lists, paragraphs)
    const rawBlocks = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent = [];
    let inMathBlock = false;
    let mathBlockContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check code block
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          rawBlocks.push({ type: 'code_block', lang: codeBlockLang, content: codeBlockContent.join('\n') });
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace(/^```/, '').trim();
          codeBlockContent = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Check block math $$...$$
      if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
        rawBlocks.push({ type: 'block_math', content: line.trim().slice(2, -2) });
        continue;
      }

      if (line.trim() === '$$') {
        if (inMathBlock) {
          rawBlocks.push({ type: 'block_math', content: mathBlockContent.join('\n') });
          inMathBlock = false;
          mathBlockContent = [];
        } else {
          inMathBlock = true;
          mathBlockContent = [];
        }
        continue;
      }

      if (inMathBlock) {
        mathBlockContent.push(line);
        continue;
      }

      // Check headers
      if (line.startsWith('### ')) {
        rawBlocks.push({ type: 'h3', content: line.substring(4) });
      } else if (line.startsWith('## ')) {
        rawBlocks.push({ type: 'h2', content: line.substring(3) });
      } else if (line.startsWith('# ')) {
        rawBlocks.push({ type: 'h1', content: line.substring(2) });
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        rawBlocks.push({ type: 'list_item', content: line.trim().substring(2) });
      } else if (/^\d+\.\s/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s(.*)$/);
        rawBlocks.push({ type: 'ordered_item', num: match[1], content: match[2] });
      } else if (line.trim() === '') {
        rawBlocks.push({ type: 'spacer' });
      } else {
        rawBlocks.push({ type: 'paragraph', content: line });
      }
    }

    if (inCodeBlock && codeBlockContent.length > 0) {
      rawBlocks.push({ type: 'code_block', lang: codeBlockLang, content: codeBlockContent.join('\n') });
    }
    if (inMathBlock && mathBlockContent.length > 0) {
      rawBlocks.push({ type: 'block_math', content: mathBlockContent.join('\n') });
    }

    return rawBlocks;
  }, [text]);

  if (!elements) return null;

  return (
    <div className="formatted-message-body" style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
      {elements.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={idx} style={{ fontSize: '1.25rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '12px 0 6px', color: 'var(--cyan, #6ef6f7)' }}>
                {formatInlineText(block.content)}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} style={{ fontSize: '1.1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '10px 0 4px', color: 'var(--cyan, #6ef6f7)' }}>
                {formatInlineText(block.content)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} style={{ fontSize: '0.98rem', fontFamily: 'Syne, sans-serif', fontWeight: 600, margin: '8px 0 4px', color: '#fff' }}>
                {formatInlineText(block.content)}
              </h3>
            );
          case 'block_math':
            return (
              <div 
                key={idx} 
                className="katex-block-wrapper"
                style={{ 
                  margin: '10px 0', 
                  padding: '8px 12px', 
                  background: 'rgba(0,0,0,0.35)', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflowX: 'auto',
                  textAlign: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }}
              />
            );
          case 'code_block':
            return (
              <pre 
                key={idx} 
                style={{ 
                  background: 'rgba(3, 5, 8, 0.85)', 
                  border: '1px solid rgba(110, 246, 247, 0.15)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  overflowX: 'auto',
                  margin: '8px 0',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '0.85rem',
                  color: '#c8d0e0'
                }}
              >
                <code>{block.content}</code>
              </pre>
            );
          case 'list_item':
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}>
                <span style={{ color: 'var(--cyan, #6ef6f7)', fontWeight: 'bold' }}>•</span>
                <div>{formatInlineText(block.content)}</div>
              </div>
            );
          case 'ordered_item':
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}>
                <span style={{ color: 'var(--cyan, #6ef6f7)', fontFamily: 'DM Mono, monospace', fontSize: '0.85em', fontWeight: 600 }}>{block.num}.</span>
                <div>{formatInlineText(block.content)}</div>
              </div>
            );
          case 'spacer':
            return <div key={idx} style={{ height: '6px' }} />;
          default:
            return (
              <p key={idx} style={{ margin: '4px 0' }}>
                {formatInlineText(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
}
