#!/usr/bin/env node
/**
 * verify-connection.mjs — Kiểm tra kết nối tới Supabase project.
 *
 * Cách chạy:
 *   node scripts/verify-connection.mjs
 *
 * Env được đọc từ apps/mobile/.env (hoặc biến môi trường đã export).
 * Script KHÔNG chạy schema — xem hướng dẫn ở output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, 'apps', 'mobile', '.env');

function loadEnv() {
  const vars = { ...process.env };
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !vars[m[1]]) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return vars;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const fail = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

if (!url || url.includes('placeholder')) {
  fail('Thiếu EXPO_PUBLIC_SUPABASE_URL trong apps/mobile/.env (hoặc còn giá trị placeholder).');
}
if (!anonKey || anonKey.includes('placeholder')) {
  fail('Thiếu EXPO_PUBLIC_SUPABASE_ANON_KEY trong apps/mobile/.env (hoặc còn giá trị placeholder).');
}

console.log(`✓ Đọc được env: ${url}`);

// 1. Health check Auth endpoint (cần header apikey)
try {
  const res = await fetch(`${url}/auth/v1/health`, {
    method: 'GET',
    headers: { apikey: anonKey },
  });
  if (!res.ok) {
    fail(`Auth health check thất bại (HTTP ${res.status}) — kiểm tra URL project hoặc anon key.`);
  }
  console.log('✓ Auth endpoint phản hồi OK (anon key hợp lệ)');
} catch (e) {
  fail(`Không kết nối được tới ${url} — kiểm tra URL và mạng.\n  ${e.message}`);
}

// 2. Kiểm tra REST endpoint với anon key (kiểm tra key hợp lệ)
try {
  const res = await fetch(`${url}/rest/v1/user_profiles?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (res.status === 401 || res.status === 403) {
    fail('Anon key bị từ chối (HTTP 401/403) — kiểm tra lại EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  if (res.status === 404) {
    console.log('⚠  REST OK nhưng bảng user_profiles chưa tồn tại — cần chạy schema (xem bước dưới).');
  } else if (res.ok) {
    console.log('✓ REST endpoint OK với anon key (user_profiles đã có thể query được).');
  }
} catch (e) {
  fail(`Lỗi khi gọi REST endpoint: ${e.message}`);
}

if (serviceKey && !serviceKey.includes('placeholder')) {
  console.log('✓ SUPABASE_SERVICE_ROLE_KEY đã có (chỉ dùng server / Edge Function).');
} else {
  console.log('⚠  SUPABASE_SERVICE_ROLE_KEY chưa đặt — chỉ cần khi deploy Edge Functions (module 5+).');
}

console.log('\n=== CÁCH CHẠY SCHEMA ===');
console.log('Mở Supabase Dashboard → SQL Editor → New query, dán nội dung file:');
console.log('  supabase/schema.sql');
console.log('rồi bấm Run. (Script này không thể chạy DDL qua REST với service role key.)');
