import React, { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';

/**
 * Safely renders LaTeX string into HTML via KaTeX with output: 'html'
 * to avoid duplicate MathML rendering issues across different browsers.
 */
function renderLatex(latex, displayMode = false) {
  if (!latex || typeof latex !== 'string') return '';
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
      trust: true
    });
  } catch (err) {
    return `<span class="katex-fallback">${latex}</span>`;
  }
}

/**
 * Formats inline text with inline math \(...\) or $...$, bold, italic, code, links
 */
function formatInlineText(text) {
  if (!text || typeof text !== 'string') return null;

  const tokens = [];
  // Tokenize by:
  // 1. LaTeX inline math: \( ... \)
  // 2. TeX inline math: $...$ (non-greedy, no newline)
  // 3. Bold: **...** or __...__
  // 4. Strikethrough: ~~...~~
  // 5. Inline Code: `...`
  // 6. Italic: *...* or _..._
  // 7. Markdown links: [text](url)
  const inlineRegex = /(\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+?\$|\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|`[^`]+?`|(?<!\*)\*[^*]+?\*(?!\*)|(?<!_)_[^_]+?_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIdx = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: 'text', content: text.substring(lastIdx, match.index) });
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      // Inline LaTeX \( ... \)
      const mathContent = matchedStr.slice(2, -2);
      tokens.push({ type: 'inline_math', content: mathContent });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$') && matchedStr.length > 2) {
      // Inline TeX $ ... $
      const mathContent = matchedStr.slice(1, -1);
      tokens.push({ type: 'inline_math', content: mathContent });
    } else if ((matchedStr.startsWith('**') && matchedStr.endsWith('**')) || (matchedStr.startsWith('__') && matchedStr.endsWith('__'))) {
      // Bold
      tokens.push({ type: 'bold', content: matchedStr.slice(2, -2) });
    } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      // Strikethrough
      tokens.push({ type: 'strikethrough', content: matchedStr.slice(2, -2) });
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      // Inline code
      tokens.push({ type: 'code', content: matchedStr.slice(1, -1) });
    } else if ((matchedStr.startsWith('*') && matchedStr.endsWith('*')) || (matchedStr.startsWith('_') && matchedStr.endsWith('_'))) {
      // Italic
      tokens.push({ type: 'italic', content: matchedStr.slice(1, -1) });
    } else if (matchedStr.startsWith('[') && match[2] && match[3]) {
      // Link [text](url)
      tokens.push({ type: 'link', text: match[2], url: match[3] });
    } else {
      tokens.push({ type: 'text', content: matchedStr });
    }

    lastIdx = inlineRegex.lastIndex;
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
            style={{ margin: '0 2px', display: 'inline' }}
          />
        );
      case 'bold':
        return <strong key={i} style={{ color: '#ffffff', fontWeight: 600 }}>{formatInlineText(token.content)}</strong>;
      case 'italic':
        return <em key={i} style={{ color: '#d1d8e6', fontStyle: 'italic' }}>{formatInlineText(token.content)}</em>;
      case 'strikethrough':
        return <del key={i} style={{ color: '#8e9bb9', textDecoration: 'line-through' }}>{formatInlineText(token.content)}</del>;
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
              color: 'var(--cyan, #6ef6f7)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {token.content}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--cyan, #6ef6f7)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            {token.text}
          </a>
        );
      default:
        return <span key={i}>{token.content}</span>;
    }
  });
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(3, 5, 8, 0.9)',
      border: '1px solid rgba(110, 246, 247, 0.18)',
      borderRadius: '8px',
      margin: '10px 0',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.75rem',
        fontFamily: 'DM Mono, monospace',
        color: '#8e9bb9'
      }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#34d399' : '#8e9bb9',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
          title="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '12px',
        overflowX: 'auto',
        fontFamily: 'DM Mono, monospace',
        fontSize: '0.84rem',
        lineHeight: 1.5,
        color: '#d6deeb'
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TableBlock({ rows }) {
  if (!rows || rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div style={{ margin: '12px 0', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', fontFamily: 'Inter, sans-serif' }}>
        <thead>
          <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {header.map((cell, idx) => (
              <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--cyan, #6ef6f7)' }}>
                {formatInlineText(cell.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rIdx) => (
            <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ padding: '8px 12px', color: '#c8d0e0' }}>
                  {formatInlineText(cell.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main FormattedMessage Component
 */
export default function FormattedMessage({ text = '', isUser = false }) {
  const blocks = useMemo(() => {
    if (!text || typeof text !== 'string') return [];

    // Pre-normalize display LaTeX delimiters:
    // Convert \[ ... \] to $$ ... $$
    let normalized = text.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');

    const rawBlocks = [];
    const lines = normalized.split('\n');

    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent = [];

    let inMathBlock = false;
    let mathBlockContent = [];

    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code Block boundary
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          rawBlocks.push({ type: 'code_block', lang: codeBlockLang, content: codeBlockContent.join('\n') });
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = [];
        } else {
          // Finish any ongoing table
          if (inTable) {
            rawBlocks.push({ type: 'table', rows: tableRows });
            inTable = false;
            tableRows = [];
          }
          inCodeBlock = true;
          codeBlockLang = trimmed.replace(/^```/, '').trim();
          codeBlockContent = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // 2. Block Math boundary ($$ on own line, or $$...$$ single line)
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4 && trimmed.indexOf('$$', 2) === trimmed.length - 2) {
        if (inTable) {
          rawBlocks.push({ type: 'table', rows: tableRows });
          inTable = false;
          tableRows = [];
        }
        rawBlocks.push({ type: 'block_math', content: trimmed.slice(2, -2).trim() });
        continue;
      }

      if (trimmed === '$$') {
        if (inMathBlock) {
          rawBlocks.push({ type: 'block_math', content: mathBlockContent.join('\n').trim() });
          inMathBlock = false;
          mathBlockContent = [];
        } else {
          if (inTable) {
            rawBlocks.push({ type: 'table', rows: tableRows });
            inTable = false;
            tableRows = [];
          }
          inMathBlock = true;
          mathBlockContent = [];
        }
        continue;
      }

      if (inMathBlock) {
        mathBlockContent.push(line);
        continue;
      }

      // 3. Tables
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        // Check if this is a separator line |---|---|
        const isSeparator = /^\|[\s-:]+(\|[\s-:]+)+\|$/.test(trimmed);
        if (!isSeparator) {
          const cells = trimmed.slice(1, -1).split('|');
          if (!inTable) {
            inTable = true;
            tableRows = [cells];
          } else {
            tableRows.push(cells);
          }
        }
        continue;
      } else if (inTable) {
        rawBlocks.push({ type: 'table', rows: tableRows });
        inTable = false;
        tableRows = [];
      }

      // 4. Blockquotes
      if (trimmed.startsWith('> ')) {
        rawBlocks.push({ type: 'blockquote', content: trimmed.substring(2) });
        continue;
      }

      // 5. Horizontal Rule
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        rawBlocks.push({ type: 'hr' });
        continue;
      }

      // 6. Headers
      if (line.startsWith('#### ')) {
        rawBlocks.push({ type: 'h4', content: line.substring(5) });
      } else if (line.startsWith('### ')) {
        rawBlocks.push({ type: 'h3', content: line.substring(4) });
      } else if (line.startsWith('## ')) {
        rawBlocks.push({ type: 'h2', content: line.substring(3) });
      } else if (line.startsWith('# ')) {
        rawBlocks.push({ type: 'h1', content: line.substring(2) });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        rawBlocks.push({ type: 'list_item', content: trimmed.substring(2) });
      } else if (/^\d+\.\s/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s(.*)$/);
        rawBlocks.push({ type: 'ordered_item', num: match[1], content: match[2] });
      } else if (trimmed === '') {
        rawBlocks.push({ type: 'spacer' });
      } else {
        rawBlocks.push({ type: 'paragraph', content: line });
      }
    }

    if (inCodeBlock && codeBlockContent.length > 0) {
      rawBlocks.push({ type: 'code_block', lang: codeBlockLang, content: codeBlockContent.join('\n') });
    }
    if (inMathBlock && mathBlockContent.length > 0) {
      rawBlocks.push({ type: 'block_math', content: mathBlockContent.join('\n').trim() });
    }
    if (inTable && tableRows.length > 0) {
      rawBlocks.push({ type: 'table', rows: tableRows });
    }

    return rawBlocks;
  }, [text]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="formatted-message-body" style={{ lineHeight: 1.6, fontSize: '0.92rem', color: isUser ? '#ffffff' : '#f0f4fc' }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1 key={idx} style={{ fontSize: '1.25rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '14px 0 6px', color: 'var(--cyan, #6ef6f7)' }}>
                {formatInlineText(block.content)}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} style={{ fontSize: '1.1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '12px 0 4px', color: 'var(--cyan, #6ef6f7)' }}>
                {formatInlineText(block.content)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} style={{ fontSize: '0.98rem', fontFamily: 'Syne, sans-serif', fontWeight: 600, margin: '10px 0 4px', color: '#ffffff' }}>
                {formatInlineText(block.content)}
              </h3>
            );
          case 'h4':
            return (
              <h4 key={idx} style={{ fontSize: '0.92rem', fontFamily: 'Syne, sans-serif', fontWeight: 600, margin: '8px 0 2px', color: '#d1d8e6' }}>
                {formatInlineText(block.content)}
              </h4>
            );
          case 'block_math':
            return (
              <div 
                key={idx} 
                className="katex-display-wrapper"
                style={{ 
                  margin: '12px 0', 
                  padding: '12px 16px', 
                  background: 'rgba(3, 5, 8, 0.65)', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(110, 246, 247, 0.2)',
                  overflowX: 'auto',
                  textAlign: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: renderLatex(block.content, true) }}
              />
            );
          case 'code_block':
            return <CodeBlock key={idx} lang={block.lang} code={block.content} />;
          case 'table':
            return <TableBlock key={idx} rows={block.rows} />;
          case 'blockquote':
            return (
              <blockquote 
                key={idx} 
                style={{ 
                  margin: '8px 0', 
                  padding: '8px 12px', 
                  borderLeft: '3px solid var(--cyan, #6ef6f7)', 
                  background: 'rgba(110, 246, 247, 0.05)', 
                  borderRadius: '0 6px 6px 0',
                  color: '#c8d0e0',
                  fontStyle: 'italic'
                }}
              >
                {formatInlineText(block.content)}
              </blockquote>
            );
          case 'hr':
            return <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0' }} />;
          case 'list_item':
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '4px' }}>
                <span style={{ color: 'var(--cyan, #6ef6f7)', fontWeight: 'bold' }}>•</span>
                <div style={{ flex: 1 }}>{formatInlineText(block.content)}</div>
              </div>
            );
          case 'ordered_item':
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '4px' }}>
                <span style={{ color: 'var(--cyan, #6ef6f7)', fontFamily: 'DM Mono, monospace', fontSize: '0.85em', fontWeight: 600 }}>{block.num}.</span>
                <div style={{ flex: 1 }}>{formatInlineText(block.content)}</div>
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
