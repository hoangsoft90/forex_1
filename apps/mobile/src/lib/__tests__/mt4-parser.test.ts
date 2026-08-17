import { parseMt4History } from '../mt4-parser';

/**
 * ⚠️ Các bộ test data này là GIẢ LẬP theo format tài liệu công khai MetaQuotes +
 * format phổ biến khi copy từ MT4. CHƯA verify với export thật từ MT4 — test pass
 * KHÔNG đồng nghĩa module hoàn thành thật sự (cần test với dữ liệu thật).
 */

describe('parseMt4History — format desktop (tab-separated, thứ tự cột chuẩn MT4)', () => {
  it('bộ 1: 2 lệnh đóng + 1 lệnh Balance (bỏ qua)', () => {
    const text = [
      'Order\tTime\tType\tSize\tSymbol\tPrice\tS/L\tT/P\tTime\tPrice\tCommission\tTaxes\tSwap\tProfit\tComments',
      '10001\t2024.01.02 10:15\tbuy\t0.10\tEURUSD\t1.10000\t1.09500\t1.11000\t2024.01.02 14:30\t1.11000\t0.00\t0.00\t0.00\t100.00\t[manual]',
      '10002\t2024.01.02 15:00\tsell\t0.20\tXAUUSD\t2400.00\t2410.00\t2390.00\t2024.01.02 18:00\t2390.00\t0.00\t0.00\t-5.00\t-50.00\t[s/l]',
      '10003\t2024.01.02 20:00\tbalance\t-\t-\t-\t-\t-\t2024.01.02 20:05\t-\t-\t-\t-\t1000.00\tdeposit',
    ].join('\n');

    const r = parseMt4History(text);
    expect(r.errorLines).toHaveLength(0);
    expect(r.trades).toHaveLength(2);

    const buy = r.trades[0];
    expect(buy.direction).toBe('buy');
    expect(buy.symbol).toBe('EURUSD');
    expect(buy.lotSize).toBeCloseTo(0.1, 6);
    expect(buy.openPrice).toBeCloseTo(1.1, 6);
    expect(buy.sl).toBeCloseTo(1.095, 6);
    expect(buy.tp).toBeCloseTo(1.11, 6);
    expect(buy.closeTime).not.toBeNull();
    expect(buy.closePrice).toBeCloseTo(1.11, 6);
    expect(buy.profit).toBeCloseTo(100, 6);

    const sell = r.trades[1];
    expect(sell.direction).toBe('sell');
    expect(sell.symbol).toBe('XAUUSD');
    expect(sell.profit).toBeCloseTo(-50, 6);
  });
});

describe('parseMt4History — format mobile/báo cáo (Ticket, Open Time, Item...)', () => {
  it('bộ 2: format "Closed Transactions" kiểu báo cáo MT4', () => {
    const text = [
      'Ticket\tOpen Time\tType\tSize\tItem\tPrice\tS/L\tT/P\tClose Time\tPrice\tCommission\tTaxes\tSwap\tProfit',
      '10001\t2024.01.02 10:15\tbuy\t0.10\tEURUSD\t1.10000\t1.09500\t1.11000\t2024.01.02 14:30\t1.11000\t0.00\t0.00\t0.00\t100.00',
      '10002\t2024.01.02 15:00\tsell\t0.50\tUSDJPY\t150.000\t150.500\t149.500\t2024.01.02 18:00\t149.500\t0.00\t0.00\t0.00\t333.33',
    ].join('\n');

    const r = parseMt4History(text);
    expect(r.errorLines).toHaveLength(0);
    expect(r.trades).toHaveLength(2);
    expect(r.trades[0].symbol).toBe('EURUSD');
    expect(r.trades[1].symbol).toBe('USDJPY');
    expect(r.trades[1].direction).toBe('sell');
    expect(r.trades[1].lotSize).toBeCloseTo(0.5, 6);
  });
});

describe('parseMt4History — lệnh còn mở (chưa đóng)', () => {
  it('bộ 3: dòng không có Close Time/Price → closeTime = null', () => {
    const text = [
      'Order\tTime\tType\tSize\tSymbol\tPrice\tS/L\tT/P\tTime\tPrice\tCommission\tTaxes\tSwap\tProfit\tComments',
      '20001\t2024.01.03 09:00\tbuy\t0.10\tGBPUSD\t1.27000\t1.26500\t0.00000\t\t\t0.00\t0.00\t0.00\t0.00\t[open]',
    ].join('\n');
    const r = parseMt4History(text);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].closeTime).toBeNull();
    expect(r.trades[0].closePrice).toBeNull();
  });
});

describe('parseMt4History — format khác nhau về thứ tự cột (linh hoạt theo tên)', () => {
  it('bộ 4: cột sắp xếp khác (Type trước Order, Volume thay Size)', () => {
    const text = [
      'Type\tOrder\tTime\tVolume\tSymbol\tPrice\tS/L\tT/P\tClose Time\tClose Price\tProfit',
      'buy\t30001\t2024.01.04 08:00\t0.05\tEURUSD\t1.09000\t1.08500\t1.10000\t2024.01.04 12:00\t1.10000\t50.00',
    ].join('\n');
    const r = parseMt4History(text);
    expect(r.errorLines).toHaveLength(0);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].symbol).toBe('EURUSD');
    expect(r.trades[0].lotSize).toBeCloseTo(0.05, 6);
    expect(r.trades[0].profit).toBeCloseTo(50, 6);
  });
});

describe('parseMt4History — báo lỗi dòng không nhận diện được (không silent-fail)', () => {
  it('bộ 5: dòng thiếu cột + type lạ → errorLines, không crash', () => {
    const text = [
      'Order\tTime\tType\tSize\tSymbol\tPrice\tS/L\tT/P\tTime\tPrice\tCommission\tTaxes\tSwap\tProfit\tComments',
      '10001\t2024.01.02 10:15\tbuy\t0.10\tEURUSD\t1.10000\t1.09500\t1.11000\t2024.01.02 14:30\t1.11000\t0.00\t0.00\t0.00\t100.00\t[manual]',
      'DÒNG LỖI KHÔNG ĐÚNG FORMAT NÀY',
      '10002\t2024.01.02 15:00\ttransfer\t0.20\tXAUUSD\t2400.00\t\t\t2024.01.02 18:00\t2390.00\t0.00\t0.00\t0.00\t0.00\t[x]',
    ].join('\n');
    const r = parseMt4History(text);
    expect(r.trades).toHaveLength(1);
    expect(r.errorLines.length).toBeGreaterThanOrEqual(1);
    const reasons = r.errorLines.map((e) => e.reason).join(' ');
    expect(reasons).toMatch(/không nhận diện|Type|Thiếu/i);
  });

  it('không có header → báo lỗi rõ ràng', () => {
    const r = parseMt4History('đây không phải dữ liệu MT4\nchỉ là text thường');
    expect(r.trades).toHaveLength(0);
    expect(r.errorLines.length).toBeGreaterThan(0);
  });
});
