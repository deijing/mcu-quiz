import rawQuestions from './questions.json';
import { Question, QuestionType } from '../types/question';

export const allQuestions: Question[] = rawQuestions as Question[];

// Collect unique tags
export const allTags: string[] = Array.from(
  new Set(allQuestions.flatMap((q) => q.tags || []))
).filter(Boolean).sort();

// Counts by type
export const typeCounts: Record<QuestionType | 'all', number> = {
  all: allQuestions.length,
  choice: allQuestions.filter((q) => q.type === 'choice').length,
  blank: allQuestions.filter((q) => q.type === 'blank').length,
  judge: allQuestions.filter((q) => q.type === 'judge').length,
  qa: allQuestions.filter((q) => q.type === 'qa').length,
  code: allQuestions.filter((q) => q.type === 'code').length,
};

export const typeDisplayNames: Record<QuestionType, string> = {
  choice: '单选题',
  blank: '填空题',
  judge: '判断题',
  qa: '简答题',
  code: '程序题',
};
