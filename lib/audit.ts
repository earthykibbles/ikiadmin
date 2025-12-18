import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { nanoid } from 'nanoid';

export type AuditSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type AuditEventInput = {
  userId?: string | null;
  action: string;
  severity?: AuditSeverity;
  message?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const {
    userId = null,
    action,
    severity = 'info',
    message,
    ipAddress,
    userAgent,
    metadata,
  } = input;

  try {
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: userId ?? null,
      action,
      severity,
      message,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: metadata ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    // Avoid throwing from logging to not break primary flows.
    console.error('Failed to write audit log event', err);
  }
}

