/**
 * Weakness Profiling Quiz — Module 1 (Onboarding).
 *
 * 7 câu single-select, mỗi câu map sang 1 key trong `weakness_profile` (jsonb).
 * Format `weakness_profile` theo data_model.md:
 *   { "revenge_trading": true, "moves_sl": true, ... }
 *
 * Ngưỡng chuyển boolean: trả lời "Thường xuyên" hoặc "Luôn luôn" → true
 * (có biểu hiện điểm yếu), còn lại → false.
 */

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
    question: 'Bạn có hay mở lệnh ngược chiều ngay sau khi vừa bị dừng lỗ (SL) không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q2',
    profileKey: 'moves_sl',
    question: 'Bạn có hay dời Stop Loss ra xa hơn khi giá đi ngược dự kiến không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q3',
    profileKey: 'increases_lot_after_loss',
    question: 'Bạn có hay tăng khối lượng (lot) sau khi thua lệnh để "gỡ" lại không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q4',
    profileKey: 'trades_before_news',
    question: 'Bạn có hay vào lệnh ngay trước/trong lúc tin tức kinh tế lớn (NFP, CPI, quyết định lãi suất) không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q5',
    profileKey: 'trades_without_plan',
    question: 'Bạn có hay vào lệnh mà không có kế hoạch (không xác định trước Entry/SL/TP) không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q6',
    profileKey: 'overtrades',
    question: 'Bạn có hay giao dịch quá nhiều lần trong ngày so với kế hoạch ban đầu không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
  {
    id: 'q7',
    profileKey: 'overconfident_size',
    question: 'Bạn có hay vào lệnh với khối lượng lớn hơn mức rủi ro đã đặt ra không?',
    options: [
      { label: 'Không bao giờ', weight: 0 },
      { label: 'Thỉnh thoảng', weight: 1 },
      { label: 'Thường xuyên', weight: 2 },
      { label: 'Luôn luôn', weight: 3 },
    ],
  },
];

/** Ngưỡng trọng số để coi là "có điểm yếu" (>=2 = Thường xuyên/Luôn luôn). */
export const WEAK_POINT_THRESHOLD = 2;

export type QuizAnswerMap = Record<string, number>; // questionId -> weight

/** Chuyển câu trả lời (questionId -> weight) thành weakness_profile jsonb. */
export function buildWeaknessProfile(answers: QuizAnswerMap): Record<string, boolean> {
  const profile: Record<string, boolean> = {};
  for (const q of QUIZ_QUESTIONS) {
    const weight = answers[q.id];
    if (weight === undefined) {
      throw new Error(`Thiếu câu trả lời cho câu hỏi "${q.id}" (${q.profileKey})`);
    }
    profile[q.profileKey] = weight >= WEAK_POINT_THRESHOLD;
  }
  return profile;
}

/** Kiểm tra một bộ câu trả lời đã trả lời đủ 7 câu chưa. */
export function isQuizComplete(answers: QuizAnswerMap): boolean {
  return QUIZ_QUESTIONS.every((q) => answers[q.id] !== undefined);
}
