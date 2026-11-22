import type { Request, Response } from 'express';
import type { Environment } from '../config/environment';
export function cookieName(env: Environment) {
  return env.NODE_ENV === 'production' ? '__Host-gulf_session' : 'gulf_session';
}
export function readSessionCookie(
  req: Request,
  env: Environment,
): string | undefined {
  const values = (req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(cookieName(env) + '='));
  if (values.length !== 1) return undefined;
  const token = values[0].slice(cookieName(env).length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export function setSessionCookie(
  res: Response,
  env: Environment,
  token: string,
  expiresAt: Date,
) {
  res.cookie(cookieName(env), token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}
export function clearSessionCookie(res: Response, env: Environment) {
  res.clearCookie(cookieName(env), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}
