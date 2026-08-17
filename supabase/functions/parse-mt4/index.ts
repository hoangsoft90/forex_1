/**
 * Edge Function: parse-mt4 — Module 5 (Execution Capture).
 *
 * Nhận text copy từ MT4/MT5 Account History, parse thành các `trade_executions`,
 * lưu `raw_import_payload` để debug/audit, trả danh sách dòng lỗi cho user sửa tay.
 *
 * ⚠️⚠️ Parser dựa trên FORMAT GIẢ ĐỊNH (tài liệu công khai MetaQuotes + format copy
 * phổ biến) — CHƯA verify với dữ liệu thật. Cần test với export thật từ MT4 trước
 * khi coi module này là Done. Xem comment chi tiết trong src/lib/mt4-parser.ts.
 *
 * Deploy: supabase functions deploy parse-mt4 --no-verify-jwt (gọi từ client anon)
 * (cần SUPABASE_SERVICE_ROLE_KEY làm service key cho Supabase client ở đây).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ KEEP IN SYNC: parser này phải GIỐNG HỆT `apps/mobile/src/lib/mt4-parser.ts`
// (Edge Function Deno không import được từ app — đang duplicate, sửa phải sửa cả 2).
// Retention Layer Module 0: đã hardening cho biến thể format (locale số, đa format
// ngày, deal-based in/out) nhưng CHƯA verify với dữ liệu thật — test pass ≠ Done.

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

function parseMt4Time(t: string): string | null {
  const s = t.trim();
  const m = s.match(
    /^(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{2,4})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) return null;
  const [, a, b, c, h, mi, sec] = m;
  let y: string, mo: string, d: string;
  if (a.length === 4) {
    y = a; mo = b; d = c;
  } else if (c.length === 4) {
    y = c;
    const first = Number(a);
    const second = Number(b);
    if (first > 12) { d = a; mo = b; }
    else if (second > 12) { mo = a; d = b; }
    else { d = a; mo = b; }
  } else {
    return null;
  }
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  if (Number(h) > 23 || Number(mi) > 59) return null;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${mi}:${sec ?? '00'}Z`;
  return new Date(iso).toString() === 'Invalid Date' ? null : iso;
}

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

function looksNumeric(v: string): boolean {
  const s = v.trim();
  if (/^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(s)) return false;
  return /^-?\d{1,3}([.,\s]\d{3})*([.,]\d+)?$/.test(s) || /^-?\d+[.,]\d+$/.test(s);
}

function detectNumberLocale(rawText: string): NumberLocale {
  let commaDecimal = 0;
  let periodDecimal = 0;
  const tokens = rawText.split(/[\s\t\n]+/);
  for (const t of tokens) {
    if (!looksNumeric(t)) continue;
    const hasDot = t.includes('.');
    const hasComma = t.includes(',');
    if (!hasDot && !hasComma) continue;
    if (hasDot && hasComma) {
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

function parseNumber(v: string | undefined, locale: NumberLocale): number | null {
  if (v == null) return null;
  let s = v.trim().replace(/ /g, '');
  if (!s || s === '-' || s === '.') return null;
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    if (locale === 'commaDecimal') s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes('.')) {
    if (locale === 'commaDecimal' && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function isTradeType(t: string): t is 'buy' | 'sell' {
  const v = t.toLowerCase();
  return v === 'buy' || v === 'sell' || v.startsWith('buy') || v.startsWith('sell');
}

const NON_TRADE_TYPES = ['balance', 'deposit', 'withdrawal', 'credit', 'bonus', 'commission', 'interest', 'dividend', 'transfer', 'correction', 'charges', 'fee', 'adjustment'];

function entryIs(v: string | undefined, kind: 'in' | 'out'): boolean {
  if (v == null) return false;
  const e = v.trim().toLowerCase();
  return e === kind || e === kind + 'deal' || e.startsWith(kind);
}

function parseMt4History(rawText: string): ParseMt4Result {
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
    if (headerIdx === -1) continue;
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
  const colCloseTime =
    headerCols.findIndex((h) => h.includes('close time')) >= 0
      ? headerCols.findIndex((h) => h.includes('close time'))
      : secondIndexOf(headerCols, (h) => h.includes('time'));
  const colClosePrice =
    headerCols.findIndex((h) => h.includes('close price')) >= 0
      ? headerCols.findIndex((h) => h.includes('close price'))
      : secondIndexOf(headerCols, (h) => h.includes('price'));

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
        const t = buildTrade(out.n, out.text, out.cols, 'out');
        if (t) result.trades.push({ ...t, rawLine: `${t.rawLine} [deal out — không ghép được in-deal]` });
      }
    }
    const outKeys = new Set(outDeals.map((o) => o.posKey));
    for (const d of inDeals) {
      if (!outKeys.has(d.posKey)) result.trades.push(d.trade);
    }
    return result;
  }

  for (const { n, text } of dataLines) {
    const cols = splitRow(text);
    const t = buildTrade(n, text, cols, null);
    if (t) result.trades.push(t);
  }

  return result;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Lấy user từ JWT (Edge Function có verify-jwt mặc định → Authorization header)
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Thiếu text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseMt4History(text);

    // Lưu executions (chỉ lệnh đóng — có closeTime) kèm raw_import_payload
    let imported = 0;
    let openOnly = 0;
    for (const t of parsed.trades) {
      const row = {
        user_id: user.id,
        symbol: t.symbol,
        direction: t.direction,
        lot_size: t.lotSize,
        actual_entry: t.openPrice,
        actual_sl: t.sl,
        actual_tp: t.tp,
        actual_risk_percent: null, // tính sau ở module khác
        entry_time: t.openTime,
        exit_time: t.closeTime,
        exit_price: t.closePrice,
        pnl_amount: t.profit,
        source: 'copy_paste_mt4',
        raw_import_payload: {
          ticket: t.ticket,
          rawLine: t.rawLine,
          format_note: 'Giả định — chưa verify với dữ liệu thật MT4',
        },
      };
      const { error: insertErr } = await supabase.from('trade_executions').insert(row);
      if (insertErr) {
        parsed.errorLines.push({
          lineNumber: 0,
          content: t.rawLine,
          reason: `Lưu DB thất bại: ${insertErr.message}`,
        });
        continue;
      }
      imported++;
    }

    return new Response(
      JSON.stringify({
        imported,
        errorLines: parsed.errorLines,
        skippedNonTrade: parsed.skippedNonTrade,
        detectedLocale: parsed.detectedLocale,
        message: imported > 0
          ? `Import ${imported} lệnh thành công. Chú ý: format parser đang là GIẢ ĐỊNH — chưa verify với dữ liệu thật MT4 (Retention Layer Module 0 đang chờ mẫu thật).`
          : 'Không import được lệnh nào — kiểm tra các dòng lỗi bên dưới.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Lỗi server: ${e instanceof Error ? e.message : e}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
