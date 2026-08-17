/**
 * MT4/MT5 Account History Parser — Module 5 (Execution Capture) + Retention Layer Module 0.
 *
 * ⚠️⚠️⚠️ CẢNH BÁO FORMAT GIẢ ĐỊNH — CHƯA VERIFY VỚI DỮ LIỆU THẬT ⚠️⚠️⚠️
 * Parser dựa trên tài liệu công khai MetaQuotes + format phổ biến khi copy-to-clipboard
 * từ MT4/MT5 (tab-separated, header chứa Order/Ticket, Time, Type, Size/Volume,
 * Symbol/Item, Price, S/L, T/P, Profit...). Đã hardening cho các BIẾN THỂ format
 * (decimal separator theo locale, nhiều format ngày giờ, deal-based in/out),
 * NHƯNG vẫn CHƯA được verify với export thật từ MT4 (Exness/ICMarkets/XM...):
 *   - Test pass KHÔNG đồng nghĩa module hoàn thành thật sự.
 *   - Cần test với export THẬT (đạt ≥95% parse đúng, ≥3 nguồn) trước khi coi là Done
 *     (gate cứng cho Onboarding Instant Audit — retention_layer_addendum.md Module 0/3).
 */

export type ParsedMt4Trade = {
  /** ticket/order number (deal id cho deal-based) */
  ticket: string;
  symbol: string;
  direction: 'buy' | 'sell';
  lotSize: number;
  openTime: string; // ISO
  openPrice: number;
  sl: number | null;
  tp: number | null;
  closeTime: string | null; // ISO, null nếu lệnh còn mở
  closePrice: number | null;
  profit: number | null;
  /** payload gốc để debug/audit */
  rawLine: string;
};

export type ParseMt4Result = {
  trades: ParsedMt4Trade[];
  /** Các dòng không parse được (hiển thị cho user sửa tay) */
  errorLines: { lineNumber: number; content: string; reason: string }[];
  /** Số dòng hợp lệ nhưng KHÔNG phải lệnh (balance, deposit, withdrawal, credit, bonus, commission...) — bỏ qua có đếm */
  skippedNonTrade: number;
  /** Locale số đã phát hiện ('periodDecimal' | 'commaDecimal') — để debug khi user báo lỗi */
  detectedLocale: NumberLocale;
};

/** Locale số: dấu thập phân là chấm (US) hay phẩy (EU). */
export type NumberLocale = 'periodDecimal' | 'commaDecimal';

/** Tên cột chuẩn hoá → nhận diện cột từ header. */
const COLUMN_ALIASES: Record<string, string[]> = {
  order: ['order', 'ticket', 'deal'],
  position: ['position', 'pos id', 'posid'],
  time: ['time', 'opentime', 'open time', 'closetime', 'close time'],
  type: ['type'],
  entry: ['entry'],
  size: ['size', 'volume', 'vol', 'lots', 'amount'],
  symbol: ['symbol', 'item', 'instrument', 'pair'],
  price: ['price', 'openprice', 'open price', 'closeprice', 'close price'],
  sl: ['s/l', 'sl', 'stoploss', 'stop loss'],
  tp: ['t/p', 'tp', 'takeprofit', 'take profit'],
  profit: ['profit', 'pnl', 'pl'],
  balance: ['balance'],
  comment: ['comment', 'comments'],
};

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findColumnIndex(headers: string[], column: string): number {
  const aliases = COLUMN_ALIASES[column] ?? [];
  return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
}

/** Tìm index THỨ HAI của cột thoả điều kiện (dùng cho cột lặp như Time/Price trong MT4). */
function secondIndexOf(headers: string[], pred: (h: string) => boolean): number {
  let found = 0;
  for (let i = 0; i < headers.length; i++) {
    if (pred(headers[i])) {
      found++;
      if (found === 2) return i;
    }
  }
  return -1;
}

/**
 * Parse thời gian MT4 → ISO. Hỗ trợ các biến thể:
 *   YYYY.MM.DD HH:MM[:SS]   (MT4 mặc định, server time)
 *   YYYY-MM-DD HH:MM[:SS]   (một số broker/MT5)
 *   YYYY/MM/DD HH:MM[:SS]
 *   DD.MM.YYYY HH:MM[:SS]   (cài đặt ngày kiểu châu Âu trong MT4)
 *   DD/MM/YYYY hoặc MM/DD/YYYY (heuristic: phần đầu >12 → DD/MM; phần 2 >12 → MM/DD; mặc định DD/MM)
 * Giả định coi là UTC (giữ nguyên giờ gốc — giờ server).
 */
function parseMt4Time(t: string): string | null {
  const s = t.trim();
  const m = s.match(
    /^(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{2,4})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) return null;
  const [, a, b, c, h, mi, sec] = m;
  let y: string, mo: string, d: string;
  // Phần có 4 chữ số = năm.
  if (a.length === 4) {
    y = a; mo = b; d = c;
  } else if (c.length === 4) {
    // DD.MM.YYYY / DD/MM/YYYY hoặc MM/DD/YYYY
    y = c;
    const first = Number(a);
    const second = Number(b);
    if (first > 12) { d = a; mo = b; } // chắc chắn DD/MM
    else if (second > 12) { mo = a; d = b; } // chắc chắn MM/DD
    else { d = a; mo = b; } // mặc định DD/MM (phổ biến hơn ở MT4 cài EU)
  } else {
    return null; // không có năm 4 chữ số → không nhận diện được
  }
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  if (Number(h) > 23 || Number(mi) > 59) return null;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${mi}:${sec ?? '00'}Z`;
  return new Date(iso).toString() === 'Invalid Date' ? null : iso;
}

/** Tách 1 dòng thành các cột: ưu tiên tab, fallback nhiều khoảng trắng (giữ nguyên "2024.01.02 10:15"). */
function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
  const tokens = line.trim().split(/\s+/);
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i + 1 < tokens.length && /^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(tokens[i])) {
      merged.push(`${tokens[i]} ${tokens[i + 1]}`);
      i++;
    } else {
      merged.push(tokens[i]);
    }
  }
  return merged;
}

/** Token trông giống số (có thể chứa dấu phân tách nghìn/thập phân, dấu trừ). */
function looksNumeric(v: string): boolean {
  const s = v.trim();
  // Loại token dạng NGÀY (2024.01.02 / 02.01.2024...) — không phải số, tránh nhiễu vote locale.
  if (/^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(s)) return false;
  return /^-?\d{1,3}([.,\s]\d{3})*([.,]\d+)?$/.test(s) || /^-?\d+[.,]\d+$/.test(s);
}

/**
 * Phát hiện locale số DOMINANT trong toàn bộ document (majority vote giữa
 * "chấm là thập phân" vs "phẩy là thập phân") — vì không thể biết locale user
 * từ 1 paste, nên đoán theo đa số số liệu trong chính text đó.
 */
function detectNumberLocale(rawText: string): NumberLocale {
  let commaDecimal = 0;
  let periodDecimal = 0;
  // Chỉ tách theo khoảng trắng — KHÔNG tách theo phẩy (sẽ phá số thập phân kiểu EU "1,10050").
  const tokens = rawText.split(/[\s\t\n]+/);
  for (const t of tokens) {
    if (!looksNumeric(t)) continue;
    const hasDot = t.includes('.');
    const hasComma = t.includes(',');
    if (!hasDot && !hasComma) continue;
    if (hasDot && hasComma) {
      // Separator xuất hiện SAU CÙNG là dấu thập phân.
      if (t.lastIndexOf(',') > t.lastIndexOf('.')) commaDecimal++;
      else periodDecimal++;
    } else if (hasComma) {
      commaDecimal++;
    } else {
      periodDecimal++;
    }
  }
  return commaDecimal > periodDecimal ? 'commaDecimal' : 'periodDecimal';
}

/** Parse số theo locale đã phát hiện. Trả null nếu không phải số hợp lệ. */
function parseNumber(v: string | undefined, locale: NumberLocale): number | null {
  if (v == null) return null;
  let s = v.trim().replace(/ /g, '');
  if (!s || s === '-' || s === '.') return null;
  // Cả 2 dấu: dấu cuối cùng là thập phân → bỏ dấu kia (nghìn).
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    if (locale === 'commaDecimal') s = s.replace(',', '.');
    else s = s.replace(/,/g, ''); // US: phẩy là nghìn
  } else if (s.includes('.')) {
    if (locale === 'commaDecimal' && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, ''); // EU: chấm là nghìn (VD 1.100)
    }
    // periodDecimal: giữ nguyên (chấm = thập phân)
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function isTradeType(t: string): t is 'buy' | 'sell' {
  const v = t.toLowerCase();
  return v === 'buy' || v === 'sell' || v.startsWith('buy') || v.startsWith('sell');
}

/** Các loại dòng KHÔNG phải lệnh (balance/deposit/...) — bỏ qua có đếm, không phải lỗi. */
const NON_TRADE_TYPES = ['balance', 'deposit', 'withdrawal', 'credit', 'bonus', 'commission', 'interest', 'dividend', 'transfer', 'correction', 'charges', 'fee', 'adjustment'];

/** Loại "Entry" trong deal-based: in (mở) / out (đóng). */
function entryIs(v: string | undefined, kind: 'in' | 'out'): boolean {
  if (v == null) return false;
  const e = v.trim().toLowerCase();
  return e === kind || e === kind + 'deal' || e.startsWith(kind);
}

/**
 * Parse toàn bộ text copy từ MT4 Account History.
 * - Bỏ qua (có đếm) dòng Balance/Deposit/Withdrawal/Credit/Bonus/Commission...
 * - Hỗ trợ 2 kiểu export: POSITION-based (Type=buy/sell, có cả 2 cột time/price)
 *   và DEAL-based (Type=buy/sell + cột Entry=in/out, ghép in+out theo Position).
 * - Mọi dòng không parse được → errorLines kèm số dòng (KHÔNG silent-skip).
 */
export function parseMt4History(rawText: string): ParseMt4Result {
  const lines = rawText.split(/\r?\n/);
  const result: ParseMt4Result = { trades: [], errorLines: [], skippedNonTrade: 0, detectedLocale: detectNumberLocale(rawText) };
  const locale = result.detectedLocale;

  const dataLines: { n: number; text: string }[] = [];
  let headerIdx = -1;
  let headerCols: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    if (!text) continue;
    const cols = splitRow(text);
    const joined = normalizeHeader(text);
    const isHeader =
      cols.length >= 4 &&
      (COLUMN_ALIASES.order.some((a) => joined.includes(a)) ||
        COLUMN_ALIASES.position.some((a) => joined.includes(a)) ||
        joined.includes('type')) &&
      cols.some((c) => COLUMN_ALIASES.symbol.some((a) => normalizeHeader(c).includes(a))) &&
      cols.some((c) => COLUMN_ALIASES.price.some((a) => normalizeHeader(c).includes(a)));
    if (isHeader && headerIdx === -1) {
      headerIdx = i;
      headerCols = cols.map(normalizeHeader);
      continue;
    }
    if (headerIdx === -1) continue; // bỏ phần text trước header (tiêu đề báo cáo, summary)
    dataLines.push({ n: i, text });
  }

  if (headerIdx === -1) {
    return {
      trades: [],
      errorLines: [{ lineNumber: 1, content: rawText.slice(0, 100), reason: 'Không tìm thấy dòng tiêu đề cột (Order/Ticket, Type, Symbol...) — format không đúng MT4.' }],
      skippedNonTrade: 0,
      detectedLocale: locale,
    };
  }

  const colOrder = findColumnIndex(headerCols, 'order');
  const colPosition = findColumnIndex(headerCols, 'position');
  const colType = findColumnIndex(headerCols, 'type');
  const colEntry = findColumnIndex(headerCols, 'entry');
  const colSize = findColumnIndex(headerCols, 'size');
  const colSymbol = findColumnIndex(headerCols, 'symbol');
  const colPrice = findColumnIndex(headerCols, 'price');
  const colSl = findColumnIndex(headerCols, 'sl');
  const colTp = findColumnIndex(headerCols, 'tp');
  const colProfit = findColumnIndex(headerCols, 'profit');
  const colTime = findColumnIndex(headerCols, 'time');

  // MT4 desktop có 2 cột "Time" và 2 cột "Price" (open + close) — lấy cột THỨ HAI cho close.
  // MT4 mobile/báo cáo đặt tên rõ "Close Time"/"Close Price" — tìm theo tên trước.
  const colCloseTime =
    headerCols.findIndex((h) => h.includes('close time')) >= 0
      ? headerCols.findIndex((h) => h.includes('close time'))
      : secondIndexOf(headerCols, (h) => h.includes('time'));
  const colClosePrice =
    headerCols.findIndex((h) => h.includes('close price')) >= 0
      ? headerCols.findIndex((h) => h.includes('close price'))
      : secondIndexOf(headerCols, (h) => h.includes('price'));

  /** Phân tích 1 dòng thành trade (dùng chung cho position-based + deal-based). */
  function buildTrade(n: number, text: string, cols: string[], isDealLeg: 'in' | 'out' | null): ParsedMt4Trade | null {
    const typeRaw = cols[colType] ?? '';
    const typeLow = typeRaw.toLowerCase();
    if (NON_TRADE_TYPES.some((k) => typeLow.startsWith(k))) {
      result.skippedNonTrade++;
      return null;
    }
    if (!isTradeType(typeLow)) {
      result.errorLines.push({ lineNumber: n, content: text, reason: `Type không nhận diện được: "${typeRaw}"` });
      return null;
    }
    const symbol = cols[colSymbol] ?? '';
    const lotSize = parseNumber(cols[colSize], locale);
    const openPrice = parseNumber(cols[colPrice], locale);

    if (!symbol || lotSize == null || openPrice == null) {
      result.errorLines.push({ lineNumber: n, content: text, reason: 'Thiếu Symbol / Volume / Price hợp lệ.' });
      return null;
    }

    const openTimeRaw = cols[colTime] ?? '';
    const openTime = openTimeRaw ? parseMt4Time(openTimeRaw) : null;
    if (!openTime) {
      result.errorLines.push({ lineNumber: n, content: text, reason: `Thời gian mở lệnh không đúng format (YYYY.MM.DD HH:MM): "${openTimeRaw}"` });
      return null;
    }

    const closeTimeRaw = colCloseTime >= 0 ? cols[colCloseTime] : '';
    const closeTime = closeTimeRaw && closeTimeRaw !== '-' ? parseMt4Time(closeTimeRaw) : null;
    const closePriceRaw = colClosePrice >= 0 ? cols[colClosePrice] : '';
    const closePrice = closePriceRaw ? parseNumber(closePriceRaw, locale) : null;
    const profit = parseNumber(cols[colProfit], locale);

    return {
      ticket: (colOrder >= 0 ? cols[colOrder] : colPosition >= 0 ? cols[colPosition] : undefined) ?? `line-${n}`,
      symbol,
      direction: typeLow.startsWith('buy') ? 'buy' : 'sell',
      lotSize,
      openTime,
      openPrice,
      sl: parseNumber(cols[colSl], locale),
      tp: parseNumber(cols[colTp], locale),
      closeTime,
      closePrice,
      profit,
      rawLine: text,
    };
  }

  const isDealBased = colEntry >= 0;

  if (isDealBased) {
    // DEAL-based: tách in/out, ghép theo Position ID (hoặc Ticket nếu không có cột Position).
    type InDeal = { trade: ParsedMt4Trade; posKey: string };
    const inDeals: InDeal[] = [];
    const outDeals: { n: number; text: string; cols: string[]; posKey: string }[] = [];
    for (const { n, text } of dataLines) {
      const cols = splitRow(text);
      const entryRaw = colEntry >= 0 ? cols[colEntry] : '';
      const typeLow = (cols[colType] ?? '').toLowerCase();
      if (NON_TRADE_TYPES.some((k) => typeLow.startsWith(k))) {
        result.skippedNonTrade++;
        continue;
      }
      if (entryIs(entryRaw, 'in')) {
        const t = buildTrade(n, text, cols, 'in');
        if (t) inDeals.push({ trade: t, posKey: (colPosition >= 0 ? cols[colPosition] : cols[colOrder]) ?? '' });
      } else if (entryIs(entryRaw, 'out')) {
        outDeals.push({ n, text, cols, posKey: (colPosition >= 0 ? cols[colPosition] : cols[colOrder]) ?? '' });
      } else {
        // Entry trống/lạ trong deal-based → thử parse như trade thường (giữ hành vi cũ).
        const t = buildTrade(n, text, cols, null);
        if (t) result.trades.push(t);
      }
    }
    for (const out of outDeals) {
      const match = inDeals.find((d) => d.posKey && d.posKey === out.posKey);
      if (match) {
        // Ghép in+out: open từ in-deal, close + profit từ out-deal.
        // Trong deal-based, cột "Time"/"Price" của out-deal chính là thời điểm/giá ĐÓNG.
        result.trades.push({
          ...match.trade,
          closeTime: parseMt4Time(out.cols[colTime] ?? '') ?? match.trade.closeTime,
          closePrice: parseNumber(out.cols[colPrice], locale) ?? match.trade.closePrice,
          profit: parseNumber(out.cols[colProfit], locale) ?? match.trade.profit,
          rawLine: `${match.trade.rawLine}\n${out.text}`,
        });
      } else {
        // Không tìm thấy in-deal tương ứng → parse out-deal standalone (ghi chú trong rawLine).
        const t = buildTrade(out.n, out.text, out.cols, 'out');
        if (t) result.trades.push({ ...t, rawLine: `${t.rawLine} [deal out — không ghép được in-deal]` });
      }
    }
    // in-deal còn mở (chưa có out tương ứng) → lệnh mở.
    const outKeys = new Set(outDeals.map((o) => o.posKey));
    for (const d of inDeals) {
      if (!outKeys.has(d.posKey)) result.trades.push(d.trade);
    }
    return result;
  }

  // POSITION-based: mỗi dòng là 1 lệnh hoàn chỉnh (mở/đóng).
  for (const { n, text } of dataLines) {
    const cols = splitRow(text);
    const t = buildTrade(n, text, cols, null);
    if (t) result.trades.push(t);
  }

  return result;
}
