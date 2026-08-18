/**
 * Weakness Profiling Quiz — Module 1 (Onboarding).
 *
 * 7 câu single-select, mỗi câu map sang 1 key trong `weakness_profile` (jsonb).
 * Format `weakness_profile` theo data_model.md:
 *   { "revenge_trading": true, "moves_sl": true, ... }
 *
 * Ngưỡng chuyển boolean: trả lời "Thường xuyên" hoặc "Luôn luôn" → true
 * (có biểu hiện điểm yếu), còn lại → false.
 *
 * ⚠️ Nội dung câu hỏi/lựa chọn lưu dưới dạng i18n key — dịch khi render
 * (màn hình gọi `t(q.question)` / `t(opt.label)`; jest lng vi → test cũ giữ pass).
 */

import i18n from '@/i18n';

export type QuizOption = {
  label: string;
  /** Trọng số: 0 = không bao giờ ... 3 = luôn luôn */
  weight: number;
};

export type QuizQuestion = {
  id: string;
  /** Key trong weakness_profile */
  profileKey: string;
  question: string;
  options: QuizOption[];
};

/** 7 câu hỏi — map đúng các hành vi trong Behavior Engine (mục 7 plan1_final_v2.md). */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    profileKey: 'revenge_trading',
    question: 'quiz.q1.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q2',
    profileKey: 'moves_sl',
    question: 'quiz.q2.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q3',
    profileKey: 'increases_lot_after_loss',
    question: 'quiz.q3.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q4',
    profileKey: 'trades_before_news',
    question: 'quiz.q4.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q5',
    profileKey: 'trades_without_plan',
    question: 'quiz.q5.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q6',
    profileKey: 'overtrades',
    question: 'quiz.q6.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
  {
    id: 'q7',
    profileKey: 'overconfident_size',
    question: 'quiz.q7.question',
    options: [
      { label: 'quiz.option.never', weight: 0 },
      { label: 'quiz.option.sometimes', weight: 1 },
      { label: 'quiz.option.often', weight: 2 },
      { label: 'quiz.option.always', weight: 3 },
    ],
  },
];

/** Dịch câu hỏi theo ngôn ngữ hiện tại (màn hình gọi để render). */
export function localizeQuestion(q: QuizQuestion): { question: string; options: QuizOption[] } {
  return {
    question: i18n.t(q.question),
    options: q.options.map((opt) => ({ ...opt, label: i18n.t(opt.label) })),
  };
}

/** Ngưỡng trọng số để coi là "có điểm yếu" (>=2 = Thường xuyên/Luôn luôn). */
export const WEAK_POINT_THRESHOLD = 2;

export type QuizAnswerMap = Record<string, number>; // questionId -> weight

/** Chuyển câu trả lời (questionId -> weight) thành weakness_profile jsonb. */
export function buildWeaknessProfile(answers: QuizAnswerMap): Record<string, boolean> {
  const profile: Record<string, boolean> = {};
  for (const q of QUIZ_QUESTIONS) {
    const weight = answers[q.id];
    if (weight === undefined) {
      throw new Error(i18n.t('quiz.missingAnswer', { id: q.id, key: q.profileKey }));
    }
    profile[q.profileKey] = weight >= WEAK_POINT_THRESHOLD;
  }
  return profile;
}

/** Kiểm tra một bộ câu trả lời đã trả lời đủ 7 câu chưa. */
export function isQuizComplete(answers: QuizAnswerMap): boolean {
  return QUIZ_QUESTIONS.every((q) => answers[q.id] !== undefined);
}
