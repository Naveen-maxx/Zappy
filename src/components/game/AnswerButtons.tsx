import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Triangle, Square, Circle, Star } from 'lucide-react';

interface AnswerButtonsProps {
  options: string[];
  selectedAnswer: number | null;
  correctAnswer: number | null;
  disabled?: boolean;
  onSelect: (index: number) => void;
}

const answerStyles = [
  { class: 'answer-red', icon: Triangle, bgHover: 'hover:bg-red-600', label: 'Option A' },
  { class: 'answer-blue', icon: Square, bgHover: 'hover:bg-blue-600', label: 'Option B' },
  { class: 'answer-green', icon: Circle, bgHover: 'hover:bg-green-600', label: 'Option C' },
  { class: 'answer-yellow', icon: Star, bgHover: 'hover:bg-yellow-600', label: 'Option D' },
];

export function AnswerButtons({
  options,
  selectedAnswer,
  correctAnswer,
  disabled = false,
  onSelect,
}: AnswerButtonsProps) {
  const showResults = correctAnswer !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full" role="group" aria-label="Answer options">
      {options.map((option, index) => {
        const style = answerStyles[index];
        const Icon = style.icon;
        const isSelected = selectedAnswer === index;
        const isCorrect = correctAnswer === index;
        const isWrong = showResults && isSelected && !isCorrect;

        return (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            onClick={() => !disabled && onSelect(index)}
            disabled={disabled}
            aria-label={`${style.label}: ${option}${isSelected ? ' (selected)' : ''}${isCorrect && showResults ? ' (correct answer)' : ''}${isWrong ? ' (incorrect)' : ''}`}
            aria-pressed={isSelected}
            className={cn(
              'answer-btn relative overflow-hidden',
              style.class,
              isSelected && !showResults && 'ring-4 ring-white/50',
              showResults && isCorrect && 'ring-4 ring-success bg-success',
              isWrong && 'ring-4 ring-destructive opacity-60',
              disabled && 'cursor-not-allowed'
            )}
          >
            {/* Icon */}
            <Icon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 opacity-50" aria-hidden="true" />

            {/* Answer text */}
            <span className="w-full text-center px-8 sm:px-10 text-sm sm:text-base font-medium">
              {option}
            </span>

            {/* Correct/Wrong indicator */}
            {showResults && isCorrect && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 text-2xl"
                aria-hidden="true"
              >
                ✓
              </motion.span>
            )}
            {isWrong && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-4 text-2xl"
                aria-hidden="true"
              >
                ✗
              </motion.span>
            )}

            {/* Selection pulse effect */}
            {isSelected && !showResults && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white/20 rounded-2xl"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
