import { hash, verify, argon2id } from 'argon2';
export const passwordOptions = {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;
export function hashPassword(password: string) {
  return hash(password, passwordOptions);
}
export function verifyPassword(hash: string, password: string) {
  return verify(hash, password);
}
