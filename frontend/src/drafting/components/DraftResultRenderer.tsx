// FILE: src/drafting/components/DraftResultRenderer.tsx
// PHOENIX PROTOCOL - DRAFT RENDERER V8.0 (PROFESSIONAL LEGAL FORMATTING)

import React from 'react';
import { TFunction } from 'i18next';

interface DraftResultRendererProps {
  text: string;
  t: TFunction;
}

export const DraftResultRenderer: React.FC<DraftResultRendererProps> = ({ text }) => {
  if (!text) return null;

  // Split the raw text into lines to process headers, lists, and paragraphs
  const lines = text.split('\n');

  // Helper to parse placeholders [LIKE_THIS] and bold **like this**
  const renderFormattedText = (content: string) => {
    // 1. Split by Placeholders [...]
    const placeholderRegex = /(\[[^\]]+\])/g;
    const parts = content.split(placeholderRegex);

    return parts.map((part, index) => {
      if (part.match(placeholderRegex)) {
        // Render beautiful gray placeholder box
        const innerText = part.substring(1, part.length - 1);
        return (
          <span 
            key={index} 
            className="inline-block bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200 font-mono text-[11px] font-bold tracking-wider mx-1 align-baseline shadow-inner"
          >
            {innerText}
          </span>
        );
      }

      // 2. Parse basic Markdown Bold (**text**) within the normal text
      const boldRegex = /(\*\*[^*]+\*\*)/g;
      const boldParts = part.split(boldRegex);

      return boldParts.map((bPart, bIndex) => {
        if (bPart.match(boldRegex)) {
          return (
            <strong key={`${index}-${bIndex}`} className="font-bold text-black">
              {bPart.substring(2, bPart.length - 2)}
            </strong>
          );
        }
        return <span key={`${index}-${bIndex}`}>{bPart}</span>;
      });
    });
  };

  const renderLine = (line: string, index: number) => {
    const trimmedLine = line.trim();

    // Empty lines become spacing
    if (!trimmedLine) {
      return <div key={index} className="h-4" />;
    }

    // Main Headers (e.g., # GJYKATA THEMELORE)
    if (trimmedLine.startsWith('# ')) {
      return (
        <h1 key={index} className="text-2xl font-black text-center uppercase tracking-widest mb-6 mt-4">
          {renderFormattedText(trimmedLine.substring(2))}
        </h1>
      );
    }

    // Sub Headers (e.g., ## 1. PALËT)
    if (trimmedLine.startsWith('## ')) {
      return (
        <h2 key={index} className="text-lg font-bold text-center uppercase tracking-wider mb-4 mt-6">
          {renderFormattedText(trimmedLine.substring(3))}
        </h2>
      );
    }

    // Section Headers (e.g., ### ARSYETIMI)
    if (trimmedLine.startsWith('### ')) {
      return (
        <h3 key={index} className="text-base font-bold text-left uppercase mb-2 mt-4">
          {renderFormattedText(trimmedLine.substring(4))}
        </h3>
      );
    }

    // Bullet Points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      return (
        <div key={index} className="flex items-start mb-2 ml-4">
          <span className="mr-2 text-black">•</span>
          <p className="leading-relaxed text-justify">
            {renderFormattedText(trimmedLine.substring(2))}
          </p>
        </div>
      );
    }

    // Standard Paragraphs
    return (
      <p key={index} className="mb-3 leading-relaxed text-justify">
        {renderFormattedText(trimmedLine)}
      </p>
    );
  };

  return (
    <div className="font-serif text-black max-w-none text-sm sm:text-base">
      {lines.map((line, index) => renderLine(line, index))}
    </div>
  );
};