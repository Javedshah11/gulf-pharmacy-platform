import type { Request } from 'express';
import type { StaffProfile } from '@gulf/shared';
export type { StaffProfile } from '@gulf/shared';
export interface StaffSession {
  user: StaffProfile;
  sessionId: string;
  expiresAt: Date;
}
export interface StaffRequest extends Request {
  staff: StaffSession;
}
