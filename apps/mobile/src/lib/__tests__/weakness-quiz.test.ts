import {
  buildWeaknessProfile,
  isQuizComplete,
  QUIZ_QUESTIONS,
  QuizAnswerMap,
} from '../weakness-quiz';

describe('weakness-quiz', () => {
  it('có đúng 5-7 câu hỏi (theo mvp_scope: 5-7 câu)', () => {
    expect(QUIZ_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(QUIZ_QUESTIONS.length).toBeLessThanOrEqual(7);
  });

  it('mỗi câu có profileKey duy nhất và ít nhất 2 lựa chọn', () => {
    const keys = QUIZ_QUESTIONS.map((q) => q.profileKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('trả lời toàn "Thường xuyên"/"Luôn luôn" → tất cả điểm yếu true', () => {
    const answers: QuizAnswerMap = {};
    for (const q of QUIZ_QUESTIONS) {
      answers[q.id] = 2; // Thường xuyên (>= ngưỡng 2)
    }
    const profile = buildWeaknessProfile(answers);
    expect(Object.keys(profile).length).toBe(QUIZ_QUESTIONS.length);
    for (const key of keysOf(profile)) {
      expect(profile[key]).toBe(true);
    }
  });

  it('trả lời toàn "Không bao giờ" → tất cả điểm yếu false', () => {
    const answers: QuizAnswerMap = {};
    for (const q of QUIZ_QUESTIONS) {
      answers[q.id] = 0;
    }
    const profile = buildWeaknessProfile(answers);
    for (const key of keysOf(profile)) {
      expect(profile[key]).toBe(false);
    }
  });

  it('ngưỡng đúng: weight 1 → false, weight 2 → true', () => {
    const answers: QuizAnswerMap = {};
    // q1 weight 1 (Thỉnh thoảng), q2 weight 2 (Thường xuyên), còn lại weight 0
    for (const q of QUIZ_QUESTIONS) {
      answers[q.id] = 0;
    }
    answers['q1'] = 1;
    answers['q2'] = 2;
    const profile = buildWeaknessProfile(answers);
    const q1 = QUIZ_QUESTIONS.find((q) => q.id === 'q1')!;
    const q2 = QUIZ_QUESTIONS.find((q) => q.id === 'q2')!;
    expect(profile[q1.profileKey]).toBe(false);
    expect(profile[q2.profileKey]).toBe(true);
  });

  it('throw lỗi nếu thiếu câu trả lời', () => {
    const answers: QuizAnswerMap = { q1: 0 }; // thiếu q2..q7
    expect(() => buildWeaknessProfile(answers)).toThrow('Thiếu câu trả lời');
  });

  it('isQuizComplete đúng khi đủ/thiếu câu', () => {
    const partial: QuizAnswerMap = { q1: 0 };
    expect(isQuizComplete(partial)).toBe(false);
    const full: QuizAnswerMap = {};
    for (const q of QUIZ_QUESTIONS) full[q.id] = 0;
    expect(isQuizComplete(full)).toBe(true);
  });
});

function keysOf(obj: Record<string, boolean>): string[] {
  return Object.keys(obj);
}
