import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CodeSnippetEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A code editor component with a synchronized line number gutter.
 * Ensures that line numbers align perfectly with the textarea content.
 */
export function CodeSnippetEditor({ value, onChange, placeholder, className }: CodeSnippetEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  
  // Calculate lines based on value
  const lineCount = Math.max(1, (value || '').split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Sync scroll position between textarea and gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div 
      className={cn(
        "relative flex bg-black/40 border border-white/10 rounded-md overflow-hidden min-h-[200px] font-mono group focus-within:ring-1 focus-within:ring-primary/50 transition-all",
        className
      )}
    >
      {/* Gutter with line numbers */}
      <div 
        ref={gutterRef}
        className="py-3 px-2 bg-black/20 text-white/30 text-right select-none border-r border-white/5 min-w-[3rem] overflow-hidden"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      >
        {lineNumbers.map((num) => (
          <div 
            key={num} 
            className="leading-6 h-6 text-xs transition-colors group-hover:text-white/40"
          >
            {num}
          </div>
        ))}
      </div>
      
      {/* Hidden spacer to ensure line numbers don't overlay content on small screens if needed */}
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none px-3 py-3 leading-6 text-xs text-white scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-auto"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
