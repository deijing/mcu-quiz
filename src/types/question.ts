export type QuestionType = 'choice' | 'blank' | 'judge' | 'qa' | 'code';

export interface Question {
  id: number;
  type: QuestionType;
  type_name: string;
  stem: string;
  raw?: string;
  options?: Record<string, string>;
  answer: string;
  analysis: string;
  note?: string;
  tags: string[];
  full_text?: string;
  blanks?: string[];
  answer_symbol?: string;
  is_correct?: boolean;
}

export type StudyMode = 'recite' | 'practice' | 'wrong' | 'starred';

export type QuestionFilterType = 'all' | QuestionType;

export interface QuestionUserStatus {
  answered: boolean;
  userAnswer?: string | string[];
  isCorrect?: boolean;
  starred?: boolean;
  revealed?: boolean;
  answeredAt?: number;
}

export interface UserStats {
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  starredCount: number;
}
