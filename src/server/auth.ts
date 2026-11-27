import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import type { AuthOperator, AuthStatusResponse, EmployeeRole } from '../types/vendtrack.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const CLAIM_FILE = path.join('/tmp', 'vendtrack-admin-claim.json');

interface ClaimRecord {
  email: string;
  name: string;
  role: EmployeeRole;
  salt: string;
  hash: string;
}

let memoryClaim: ClaimRecord | null = null;

function loadClaim(): ClaimRecord | null {
  if (memoryClaim) return memoryClaim;
  try {
    if (fs.existsSync(CLAIM_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CLAIM_FILE, 'utf8')) as ClaimRecord;
      if (parsed && parsed.hash && parsed.salt) {
        memoryClaim = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore read errors in read-only environments
  }
  return null;
}

function saveClaim(record: ClaimRecord): void {
  memoryClaim = record;
  try {
    fs.writeFileSync(CLAIM_FILE, JSON.stringify(record), 'utf8');
  } catch {
    // Ephemeral in-memory fallback is fine on read-only FS
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function safeEqualText(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getAuthMode(): 'env' | 'claimed' | 'unclaimed' {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    return 'env';
  }
  if (loadClaim() !== null) {
    return 'claimed';
  }
  return 'unclaimed';
}

export function signSessionToken(operator: AuthOperator, ttlHours = 8): string {
  const payload = {
    email: operator.email,
    name: operator.name,
    role: operator.role,
    exp: Date.now() + ttlHours * 3600 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): AuthOperator | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (!safeEqualText(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      email: string;
      name: string;
      role: EmployeeRole;
      exp: number;
    };
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return undefined;
  if (!authHeader.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7).trim();
}

export function getAuthStatus(req: Request): AuthStatusResponse {
  const mode = getAuthMode();
  const token = extractBearerToken(req);
  const operator = verifySessionToken(token);
  return {
    mode,
    configured: mode !== 'unclaimed',
    authenticated: operator !== null,
    operator,
  };
}

export function claimFirstRunOperator(
  emailInput: string,
  password: string
): { ok: true; token: string; operator: AuthOperator } | { ok: false; error: string; status: number } {
  const mode = getAuthMode();
  if (mode !== 'unclaimed') {
    return { ok: false, error: 'Operator credentials are already configured.', status: 409 };
  }
  const email = (emailInput || 'admin@vendtrack.io').trim().toLowerCase();
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long.', status: 400 };
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const operator: AuthOperator = {
    email,
    name: 'Fleet Administrator',
    role: 'Administrator',
  };
  saveClaim({
    email: operator.email,
    name: operator.name,
    role: operator.role,
    salt,
    hash,
  });
  return {
    ok: true,
    token: signSessionToken(operator, 8),
    operator,
  };
}

export function verifyOperatorLogin(
  identifierInput: string,
  password: string,
  remember8h: boolean
): { ok: true; token: string; operator: AuthOperator } | { ok: false; error: string; status: number } {
  const identifier = (identifierInput || '').trim().toLowerCase();
  if (!identifier || !password) {
    return { ok: false, error: 'Work email/username and password are required.', status: 400 };
  }

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const ttl = remember8h ? 8 : 2;

  if (envPasscode && envPasscode.length > 0) {
    const validIdentifier = identifier === 'admin@vendtrack.io' || identifier === 'admin';
    if (!validIdentifier || !safeEqualText(password, envPasscode)) {
      return { ok: false, error: 'Invalid operator email/username or password.', status: 401 };
    }
    const operator: AuthOperator = {
      email: 'admin@vendtrack.io',
      name: 'Fleet Administrator',
      role: 'Administrator',
    };
    return { ok: true, token: signSessionToken(operator, ttl), operator };
  }

  const claimed = loadClaim();
  if (!claimed) {
    return {
      ok: false,
      error: 'No operator password configured yet. Complete first-run setup first.',
      status: 409,
    };
  }

  const validIdentifier =
    identifier === claimed.email.toLowerCase() ||
    identifier === 'admin' ||
    identifier === 'admin@vendtrack.io';
  const candidateHash = hashPassword(password, claimed.salt);
  if (!validIdentifier || !safeEqualHex(candidateHash, claimed.hash)) {
    return { ok: false, error: 'Invalid operator email/username or password.', status: 401 };
  }

  const operator: AuthOperator = {
    email: claimed.email,
    name: claimed.name,
    role: claimed.role,
  };
  return { ok: true, token: signSessionToken(operator, ttl), operator };
}

export interface AuthenticatedRequest extends Request {
  operator?: AuthOperator;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  const operator = verifySessionToken(token);
  if (!operator) {
    res.status(401).json({ error: 'Authentication required. Please sign in to VendTrack.' });
    return;
  }
  req.operator = operator;
  next();
}
