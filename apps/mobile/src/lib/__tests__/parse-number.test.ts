import { parseDecimalInput } from '../parse-number';

describe('parseDecimalInput — locale linh hoạt (chấm/phẩy)', () => {
  it('chấm thập phân', () => {
    expect(parseDecimalInput('1.5')).toBe(1.5);
    expect(parseDecimalInput('1.1000')).toBe(1.1);
    expect(parseDecimalInput('0.10')).toBe(0.1);
  });

  it('phẩy thập phân (locale EU/VI)', () => {
    expect(parseDecimalInput('1,5')).toBe(1.5);
    expect(parseDecimalInput('0,10')).toBe(0.1);
  });

  it('hàng nghìn với khoảng trắng hoặc dấu', () => {
    expect(parseDecimalInput('1 234,56')).toBe(1234.56);
    expect(parseDecimalInput('1,234.56')).toBe(1234.56);
    expect(parseDecimalInput('1.234,56')).toBe(1234.56);
    expect(parseDecimalInput('1.234.567')).toBe(1234567);
  });

  it('giá lẻ 4 chữ số sau chấm → thập phân (1.1000 = 1.1)', () => {
    expect(parseDecimalInput('1.1000')).toBe(1.1);
    expect(parseDecimalInput('0.12345')).toBe(0.12345);
  });

  it('nhóm 3 chữ số sau chấm → hàng nghìn theo chuẩn VN (10.000 = 10000)', () => {
    expect(parseDecimalInput('10.000')).toBe(10_000);
    expect(parseDecimalInput('1.234')).toBe(1_234);
  });

  it('số âm', () => {
    expect(parseDecimalInput('-5')).toBe(-5);
    expect(parseDecimalInput('-1,5')).toBe(-1.5);
  });

  it('chuỗi rỗng / không hợp lệ → null (không NaN)', () => {
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('  ')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
    expect(parseDecimalInput('-')).toBeNull();
    expect(parseDecimalInput('.')).toBeNull();
    expect(parseDecimalInput('1.2.3')).toBeNull();
    expect(parseDecimalInput('1,2,3')).toBeNull();
  });
});
