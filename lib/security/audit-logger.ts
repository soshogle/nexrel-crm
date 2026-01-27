
/**
 * Audit Logging System
 * Tracks sensitive operations and security events
 */

import { prisma } from '@/lib/db';
import { AuditAction, AuditSeverity } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        severity: data.severity || AuditSeverity.LOW,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as any,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress =
    forwardedFor?.split(',')[0] || realIp || 'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

/**
 * Pre-configured audit log helpers for common actions
 */
export const AuditLogger = {
  /**
   * Log user authentication events
   */
  logAuth: async (
    userId: string | undefined,
    action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE',
    request: Request,
    success: boolean = true,
    errorMessage?: string
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action,
      severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
      success,
      errorMessage,
    });
  },

  /**
   * Log payment operations
   */
  logPayment: async (
    userId: string,
    paymentId: string,
    request: Request,
    metadata?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action: 'PAYMENT_PROCESSED' as AuditAction,
      severity: AuditSeverity.HIGH,
      entityType: 'Payment',
      entityId: paymentId,
      ipAddress,
      userAgent,
      metadata,
      success,
      errorMessage,
    });
  },

  /**
   * Log API key operations
   */
  logApiKey: async (
    userId: string,
    action: 'API_KEY_CREATED' | 'API_KEY_DELETED',
    apiKeyId: string,
    request: Request,
    metadata?: Record<string, any>
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action,
      severity: AuditSeverity.MEDIUM,
      entityType: 'ApiKey',
      entityId: apiKeyId,
      ipAddress,
      userAgent,
      metadata,
    });
  },

  /**
   * Log data modifications
   */
  logDataChange: async (
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    request: Request,
    metadata?: Record<string, any>
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    const severity =
      action === 'DELETE'
        ? AuditSeverity.MEDIUM
        : AuditSeverity.LOW;

    await createAuditLog({
      userId,
      action,
      severity,
      entityType,
      entityId,
      ipAddress,
      userAgent,
      metadata,
    });
  },

  /**
   * Log settings modifications
   */
  logSettingsChange: async (
    userId: string,
    settingType: string,
    request: Request,
    metadata?: Record<string, any>
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action: 'SETTINGS_MODIFIED' as AuditAction,
      severity: AuditSeverity.MEDIUM,
      entityType: 'Settings',
      entityId: settingType,
      ipAddress,
      userAgent,
      metadata,
    });
  },

  /**
   * Log data exports
   */
  logDataExport: async (
    userId: string,
    exportType: string,
    request: Request,
    metadata?: Record<string, any>
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action: 'DATA_EXPORT' as AuditAction,
      severity: AuditSeverity.HIGH,
      entityType: 'Export',
      entityId: exportType,
      ipAddress,
      userAgent,
      metadata,
    });
  },

  /**
   * Log team member operations
   */
  logTeamChange: async (
    userId: string,
    action: 'USER_INVITED' | 'USER_REMOVED' | 'PERMISSION_CHANGE',
    targetUserId: string,
    request: Request,
    metadata?: Record<string, any>
  ) => {
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await createAuditLog({
      userId,
      action,
      severity: AuditSeverity.HIGH,
      entityType: 'TeamMember',
      entityId: targetUserId,
      ipAddress,
      userAgent,
      metadata,
    });
  },
};

/**
 * Query audit logs with filters
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.severity) where.severity = filters.severity;
  if (filters.entityType) where.entityType = filters.entityType;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
