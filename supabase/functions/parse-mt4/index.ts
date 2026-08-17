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

// Re-export parser logic: dùng chung định nghĩa với app để đảm bảo test đối chiếu.
// (Trong Deno, import từ file local — Edge Function deploy sẽ bundle cả file.)
export type ParsedMt4Trade = {
  ticket: string;
  symbol: string;
  direction: 'buy' | 'sell';
  lotSize: number;
  openTime: string;
  openPrice: number;
  sl: number | null;
  tp: number | null;
  closeTime: string | null;
  closePrice: number | null;
  profit: number | null;
  rawLine: string;
};

export type ParseMt4Result = {
  trades: ParsedMt4Trade[];
  errorLines: { lineNumber: number; content: string; reason: string }[];
};

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
  const m = t.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})[\sT]+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}Z`;
  return new Date(iso).toString() === 'Invalid Date' ? null : iso;
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
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

function parseMt4History(rawText: string): ParseMt4Result {
  const lines = rawText.split(/\r?\n/);
  const result: ParseMt4Result = { trades: [], errorLines: [] };
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
      (COLUMN_ALIASES.order.some((a) => joined.includes(a)) || joined.includes('type')) &&
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
    if (!typeRaw) continue;
    const typeLow = typeRaw.toLowerCase();
    if (typeLow.startsWith('balance') || typeLow.startsWith('deposit') || typeLow.startsWith('withdrawal')) continue;
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
    const closeTime = closeTimeRaw && closeTimeRaw !== '-' ? parseMt4Time(closeTimeRaw) : null;
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
        message: imported > 0
          ? `Import ${imported} lệnh thành công. Chú ý: format parser đang là GIẢ ĐỊNH — hãy kiểm tra với export MT4 thật.`
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
