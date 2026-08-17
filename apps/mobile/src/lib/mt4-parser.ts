/**
 * MT4/MT5 Account History Parser — Module 5 (Execution Capture).
 *
 * ⚠️⚠️⚠️ CẢNH BÁO FORMAT GIẢ ĐỊNH — CHƯA VERIFY VỚI DỮ LIỆU THẬT ⚠️⚠️⚠️
 * Parser này dựa trên format được mô tả trong tài liệu công khai của MetaQuotes
 * (https://www.metatrader4.com/en/trading-platform/help/overview/terminal/terminal_account_history)
 * và format phổ biến khi copy-to-clipboard từ MT4/MT5 (tab-separated, header chứa
 * Order/Ticket, Time, Type, Size/Volume, Symbol/Item, Price, S/L, T/P, Profit...).
 *
 * Parser được thiết kế LINH HOẠT theo TÊN CỘT (không phụ thuộc thứ tự cột) để chịu được
 * sự khác biệt giữa MT4 desktop và MT4 mobile, NHƯNG vẫn cần:
 *   - Test với export THẬT từ MT4 (desktop + mobile) trước khi coi module này là Done.
 *   - Các bộ test hiện tại là dữ liệu GIẢ LẬP theo format trên — test pass KHÔNG đồng
 *     nghĩa module hoàn thành thật sự.
 */

export type ParsedMt4Trade = {
  /** ticket/order number */
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
};

/** Tên cột chuẩn hoá → nhận diện cột từ header. */
const COLUMN_ALIASES: Record<string, string[]> = {
  order: ['order', 'ticket', 'deal', 'position'],
  time: ['time', 'opentime', 'open time', 'closetime', 'close time'],
  type: ['type'],
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

/** Parse "2024.01.02 10:15" (MT4 time, server time) → ISO. Giả định coi là UTC (giữ nguyên giờ gốc). */
function parseMt4Time(t: string): string | null {
  const m = t.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}Z`;
  return new Date(iso).toString() === 'Invalid Date' ? null : iso;
}

/** Tách 1 dòng thành các cột: ưu tiên tab, fallback nhiều khoảng trắng. */
function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
  // Nếu không có tab: tách theo khoảng trắng nhưng giữ nguyên time "2024.01.02 10:15"
  const tokens = line.trim().split(/\s+/);
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i + 1 < tokens.length && /^\d{4}\.\d{2}\.\d{2}$/.test(tokens[i])) {
      merged.push(`${tokens[i]} ${tokens[i + 1]}`);
      i++;
    } else {
      merged.push(tokens[i]);
    }
  }
  return merged;
}

function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function isTradeType(t: string): t is 'buy' | 'sell' {
  const v = t.toLowerCase();
  return v === 'buy' || v === 'sell' || v.startsWith('buy') || v.startsWith('sell');
}

/**
 * Parse toàn bộ text copy từ MT4 Account History.
 * Bỏ qua dòng Balance/Deposit/Withdrawal (chỉ giữ trade buy/sell).
 */
export function parseMt4History(rawText: string): ParseMt4Result {
  const lines = rawText.split(/\r?\n/);
  const result: ParseMt4Result = { trades: [], errorLines: [] };

  // Bỏ dòng trống + dòng không phải dữ liệu (như "Deals:", "Orders:", header bảng báo cáo)
  const dataLines: { n: number; text: string }[] = [];
  let headerIdx = -1;
  let headerCols: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    if (!text) continue;
    const cols = splitRow(text);
    // Header là dòng chứa các từ khoá cột
    const joined = normalizeHeader(text);
    const isHeader =
      cols.length >= 4 &&
      (COLUMN_ALIASES.order.some((a) => joined.includes(a)) ||
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
    };
  }

  const colOrder = findColumnIndex(headerCols, 'order');
  const colType = findColumnIndex(headerCols, 'type');
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

  for (const { n, text } of dataLines) {
    const cols = splitRow(text);
    const typeRaw = cols[colType] ?? '';
    if (!typeRaw) continue; // dòng trống cột type → bỏ qua

    // Bỏ dòng không phải trade (Balance, Deposit, Withdrawal, Deal...)
    const typeLow = typeRaw.toLowerCase();
    if (typeLow.startsWith('balance') || typeLow.startsWith('deposit') || typeLow.startsWith('withdrawal')) {
      continue;
    }
    if (!isTradeType(typeLow)) {
      result.errorLines.push({ lineNumber: n, content: text, reason: `Type không nhận diện được: "${typeRaw}"` });
      continue;
    }

    const symbol = cols[colSymbol] ?? '';
    const lotSize = toNum(cols[colSize]);
    const openPrice = toNum(cols[colPrice]);

    if (!symbol || lotSize == null || openPrice == null) {
      result.errorLines.push({ lineNumber: n, content: text, reason: 'Thiếu Symbol / Volume / Price hợp lệ.' });
      continue;
    }

    const openTimeRaw = cols[colTime] ?? '';
    const openTime = openTimeRaw ? parseMt4Time(openTimeRaw) : null;
    if (!openTime) {
      result.errorLines.push({ lineNumber: n, content: text, reason: `Thời gian mở lệnh không đúng format (YYYY.MM.DD HH:MM): "${openTimeRaw}"` });
      continue;
    }

    const closeTimeRaw = colCloseTime >= 0 ? cols[colCloseTime] : '';
    const closeTime = closeTimeRaw && closeTimeRaw !== '-' && closeTimeRaw !== '' ? parseMt4Time(closeTimeRaw) : null;
    const closePriceRaw = colClosePrice >= 0 ? cols[colClosePrice] : '';
    const closePrice = closePriceRaw ? toNum(closePriceRaw) : null;
    const profit = toNum(cols[colProfit]);

    result.trades.push({
      ticket: cols[colOrder] ?? `line-${n}`,
      symbol,
      direction: typeLow.startsWith('buy') ? 'buy' : 'sell',
      lotSize,
      openTime,
      openPrice,
      sl: toNum(cols[colSl]),
      tp: toNum(cols[colTp]),
      closeTime,
      closePrice,
      profit,
      rawLine: text,
    });
  }

  return result;
}
