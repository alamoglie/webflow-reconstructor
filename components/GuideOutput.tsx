'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyElementButton } from './CopyElementButton';
import { AIEngine, AIProvider, PROVIDERS } from '@/types';

interface Props {
  guide: string;
  isStreaming: boolean;
  engine: AIEngine;
  compareResults?: Partial<Record<AIProvider, string>>;
}

function CodeBlock({ children, language }: { children: string; language: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="relative group">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 text-xs px-2 py-1 rounded bg-[#2a2a2a] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
      >
        {copied ? '✓' : 'Copiar'}
      </button>
      <SyntaxHighlighter
        style={vscDarkPlus as Record<string, React.CSSProperties>}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '8px',
          fontSize: '0.8rem',
          border: '1px solid #2a2a2a',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function GuideContent({ guide, isStreaming }: { guide: string; isStreaming: boolean }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        components={{
          code({ node: _node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            return !inline ? (
              <CodeBlock language={match ? match[1] : ''}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            ) : (
              <code
                className="bg-[#2a2a2a] text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-white font-bold text-lg mt-8 mb-4 pb-2 border-b border-[#2a2a2a] flex items-center gap-2">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-gray-200 font-semibold text-base mt-5 mb-3">
                {children}
              </h3>
            );
          },
          p({ children }) {
            return <p className="text-gray-300 text-sm leading-relaxed mb-3">{children}</p>;
          },
          ul({ children }) {
            return <ul className="text-gray-300 text-sm space-y-1.5 mb-4 list-none pl-0">{children}</ul>;
          },
          li({ children }) {
            return (
              <li className="flex gap-2 text-gray-300 text-sm">
                <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                <span>{children}</span>
              </li>
            );
          },
          ol({ children }) {
            return <ol className="text-gray-300 text-sm space-y-1.5 mb-4 list-decimal pl-5">{children}</ol>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="text-left text-xs text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="text-gray-300 text-sm px-3 py-2 border-b border-[#1a1a1a]">
                {children}
              </td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-indigo-500 pl-4 my-3 text-gray-400 italic text-sm">
                {children}
              </blockquote>
            );
          },
          strong({ children }) {
            return <strong className="text-white font-semibold">{children}</strong>;
          },
        }}
      >
        {guide}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 rounded-sm" />
      )}
    </div>
  );
}

export function GuideOutput({ guide, isStreaming, engine, compareResults }: Props) {
  const compareTabs = PROVIDERS.filter(
    (p) => compareResults && compareResults[p.id] !== undefined
  );
  const [activeTab, setActiveTab] = useState<AIProvider>('anthropic');

  if (!guide && (!compareResults || Object.values(compareResults).every((v) => !v))) {
    return null;
  }

  if (engine === 'compare' && compareTabs.length > 0) {
    const activeGuide = compareResults?.[activeTab] ?? '';
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {compareTabs.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === p.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        <div className="bg-[#0f0f0f] rounded-xl border border-[#2a2a2a] p-6">
          <GuideContent guide={activeGuide} isStreaming={isStreaming} />
        </div>

        {!isStreaming && activeGuide && (
          <CopyElementButton guide={activeGuide} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0f0f0f] rounded-xl border border-[#2a2a2a] p-6">
        <GuideContent guide={guide} isStreaming={isStreaming} />
      </div>

      {!isStreaming && guide && <CopyElementButton guide={guide} />}
    </div>
  );
}
