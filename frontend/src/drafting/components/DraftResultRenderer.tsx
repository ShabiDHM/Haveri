// FILE: src/drafting/components/DraftResultRenderer.tsx
// PHOENIX PROTOCOL - RENDERER V8.4 (CLEAN FORMATTING & RICH PLACEHOLDERS)

import React from 'react';
import { TFunction } from 'i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Highlighting logic for placeholders: [TEXT] -> Yellow Highlight
const highlightPlaceholders = (text: string) => {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={i} className="bg-[#FEF08A] text-[#713F12] border border-[#FDE047] px-1.5 py-0.5 rounded-sm font-bold shadow-sm mx-0.5">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const DraftResultRenderer: React.FC<{ text: string; t: TFunction }> = React.memo(({ text }) => {
  return (
    <div className="legal-document flex flex-col h-full font-serif">
      <div className="legal-content text-black flex-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 {...props} className="text-black font-black uppercase text-center mb-8 text-xl tracking-wide" />,
            h2: ({ node, ...props }) => <h2 {...props} className="text-black font-bold uppercase text-center mt-8 mb-4 text-lg" />,
            h3: ({ node, ...props }) => <h3 {...props} className="text-black font-bold uppercase mt-6 mb-3 text-base" />,
            strong: ({ node, ...props }) => <strong {...props} className="text-black font-black" />,
            p: ({ node, children, ...props }) => (
              <p {...props} className="text-black mb-4 leading-relaxed text-justify whitespace-pre-wrap">
                {React.Children.map(children, child => typeof child === 'string' ? highlightPlaceholders(child) : child)}
              </p>
            ),
            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-8 mb-4 space-y-2 text-black text-justify" />,
            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-8 mb-4 space-y-2 text-black text-justify" />,
            li: ({ node, children, ...props }) => (
              <li {...props} className="text-black leading-relaxed pl-2">
                {React.Children.map(children, child => typeof child === 'string' ? highlightPlaceholders(child) : child)}
              </li>
            ),
            code: ({ node, inline, ...props }: any) => (
              <span {...props} className="font-mono text-sm bg-gray-100 px-1 rounded text-black" />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote {...props} className="border-l-4 border-gray-400 pl-4 py-1 my-4 text-gray-800 italic bg-gray-50" />
            )
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      
      {/* Footer Disclaimer - Strictly the requested string */}
      <div className="mt-16 pt-4 border-t border-gray-300 text-center shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
          Kjo përgjigje është gjeneruar nga AI, vetëm për referencë.
        </p>
      </div>
    </div>
  );
});