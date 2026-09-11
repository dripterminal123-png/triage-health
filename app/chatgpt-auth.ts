import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const COOKIE = 'triage_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 120000;

let schemaReady: Promise<void> | null = null;

export async function ensureAuthTables(): Promise<void> {
  if (schemaReady) return schemaReady;
  const ready = (async () => {
    await env.DB!.prepare(`CREATE TABLE IF NOT EXISTS triage_auth_users (id TEXT PRIMARY KEY NOT NULL, display_name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
    await env.DB!.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS triage_auth_users_email_idx ON triage_auth_users (email)`).run();
    await env.DB!.prepare(`CREATE TABLE IF NOT EXISTS triage_auth_sessions (token_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`).run();
    await env.DB!.prepare(`CREATE INDEX IF NOT EXISTS triage_auth_sessions_user_idx ON triage_auth_sessions (user_id)`).run();
    await env.DB!.prepare(`CREATE INDEX IF NOT EXISTS triage_auth_sessions_expires_idx ON triage_auth_sessions (expires_at)`).run();
  })();
  schemaReady = ready;
  try {
    await ready;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

type UserRow = {id:string;display_name:string;email:string};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'}, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000) return false;
  let salt: Uint8Array, expected: Uint8Array;
  try { salt = base64UrlToBytes(parts[2]); expected = base64UrlToBytes(parts[3]); } catch { return false; }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'}, key, 256));
  if (bits.length !== expected.length) return false;
  let result = 0;
  for (let i=0;i<bits.length;i++) result |= bits[i] ^ expected[i];
  return result === 0 && timingSafeEqual(bytesToBase64Url(bits), bytesToBase64Url(expected));
}

function cookieValue(cookieHeader: string|null): string|null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name,...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function sessionCookie(token: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS*24*60*60}${secure}`;
}

export function clearSessionCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export async function createSession(userId: string, requestUrl: string): Promise<{token:string;cookie:string}> {
  await ensureAuthTables();
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expires = now + SESSION_DAYS*24*60*60*1000;
  await env.DB!.prepare('INSERT INTO triage_auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(tokenHash,userId,expires,now).run();
  return {token,cookie:sessionCookie(token,requestUrl)};
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  try { await ensureAuthTables(); } catch { return null; }
  const requestHeaders = await headers();
  const token = cookieValue(requestHeaders.get('cookie'));
  if (!token) return null;
  try {
    const tokenHash = await sha256(token);
    const row = await env.DB!.prepare(`SELECT u.id,u.display_name,u.email FROM triage_auth_sessions s JOIN triage_auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash,Date.now()).first<UserRow>();
    if (!row) return null;
    return {userId:row.id,displayName:row.display_name,email:row.email,fullName:null};
  } catch { return null; }
}

export async function deleteCurrentSession(): Promise<void> {
  const requestHeaders = await headers();
  const token = cookieValue(requestHeaders.get('cookie'));
  if (!token) return;
  try { await env.DB!.prepare('DELETE FROM triage_auth_sessions WHERE token_hash=?').bind(await sha256(token)).run(); } catch {}
}
