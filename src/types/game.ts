// Shared types for the game application

export type QuestionType = 'multiple-choice' | 'code-debug';

export interface BaseQuestion {
  id: string;
  text: string;
  timeLimit: number;
  type: QuestionType;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctIndex: number;
  imageUrl?: string;
}

export interface CodeDebugQuestion extends BaseQuestion {
  type: 'code-debug';
  codeSnippet: string;
  correctLine: number; // 1-based index indicating the line with the error
  correctedCode: string; // The corrected version of that line
  imageUrl?: string; // Optional image for context
}

export type Question = MultipleChoiceQuestion | CodeDebugQuestion;

export interface Participant {
  id: string;
  name: string;
  avatarId: number;
  score?: number;
  currentStreak?: number;
  maxStreak?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatarId?: number;
  currentStreak?: number;
  maxStreak?: number;
}
