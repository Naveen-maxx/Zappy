import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QuestionType } from '@/types/game';

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  imageUrl?: string;
  className?: string;
  type?: QuestionType;
  codeSnippet?: string;
}

export function QuestionDisplay({
  questionNumber,
  totalQuestions,
  questionText,
  imageUrl,
  className,
  type = 'multiple-choice',
  codeSnippet,
}: QuestionDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center w-full max-w-4xl mx-auto', className)}
    >
      {/* Question number */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4"
      >
        <span className="font-display font-bold text-primary">
          Question {questionNumber}
        </span>
        <span className="text-muted-foreground">of {totalQuestions}</span>
      </motion.div>

      {/* Question text */}
      <motion.h2
        key={questionText}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-display font-bold leading-tight mb-6"
      >
        {questionText}
      </motion.h2>

      {/* Code Snippet Display */}
      {type === 'code-debug' && codeSnippet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-left bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-white/10 mx-auto max-w-2xl"
        >
          <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-4 text-xs text-white/40 font-mono">buggy_code.ts</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="font-mono text-sm md:text-base leading-relaxed text-blue-100">
              <code>
                {codeSnippet.split('\n').map((line, i) => (
                  <div key={i} className="table-row">
                    <span className="table-cell text-right pr-4 select-none text-white/20 w-8 border-r border-white/10 mr-4">
                      {i + 1}
                    </span>
                    <span className="table-cell pl-4 whitespace-pre-wrap break-all">
                      {line || '\n'}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </motion.div>
      )}

      {/* Question image (only if not code debug, or if requested) */}
      {type === 'multiple-choice' && imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex justify-center"
        >
          <img
            src={imageUrl}
            alt="Question illustration"
            className="max-h-56 sm:max-h-64 md:max-h-80 rounded-xl object-contain border border-border/50 shadow-lg"
          />
        </motion.div>
      )}
    </motion.div>
  );
}
