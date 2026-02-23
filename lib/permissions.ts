
/**
 * Permissions & Access Control System
 * 
 * Team member permissions are stored in TeamMember.permissions (JSON field)
 * rather than the UserPermission table, because TeamMembers are not User
 * accounts and the UserPermission FK references User.id.
 */

import { prisma } from '@/lib/db';
import { PageResource } from '@prisma/client';

export interface PermissionEntry {
  resource: PageResource;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export const ROLE_PRESETS: Record<string, {
  name: string;
  description: string;
  permissions: PermissionEntry[];
}> = {
  ADMIN: {
    name: 'Admin',
    description: 'Full access to all features',
    permissions: Object.values(PageResource).map(resource => ({
      resource,
      canRead: true,
      canWrite: true,
      canDelete: true,
    })),
  },
  MANAGER: {
    name: 'Manager',
    description: 'Read/Write access to most features, no billing',
    permissions: Object.values(PageResource).map(resource => ({
      resource,
      canRead: true,
      canWrite: resource !== PageResource.BILLING && resource !== PageResource.SETTINGS,
      canDelete: false,
    })),
  },
  AGENT: {
    name: 'Agent',
    description: 'Read/Write for leads, contacts, deals, messages',
    permissions: Object.values(PageResource).map(resource => {
      const agentResources: PageResource[] = [
        PageResource.DASHBOARD,
        PageResource.LEADS,
        PageResource.CONTACTS,
        PageResource.DEALS,
        PageResource.TASKS,
        PageResource.CALENDAR,
        PageResource.MESSAGES,
      ];
      return {
        resource,
        canRead: agentResources.includes(resource),
        canWrite: agentResources.includes(resource),
        canDelete: false,
      };
    }),
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to most features',
    permissions: Object.values(PageResource).map(resource => ({
      resource,
      canRead: resource !== PageResource.BILLING && resource !== PageResource.SETTINGS,
      canWrite: false,
      canDelete: false,
    })),
  },
};

function parsePermissions(raw: unknown): PermissionEntry[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is PermissionEntry =>
      p && typeof p === 'object' && 'resource' in p
  );
}

/**
 * Check if a team member has a specific permission for a resource
 */
export async function hasPermission(
  teamMemberId: string,
  resource: PageResource,
  action: 'READ' | 'WRITE' | 'DELETE'
): Promise<boolean> {
  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      select: { permissions: true },
    });

    const entries = parsePermissions(member?.permissions);
    const entry = entries.find(p => p.resource === resource);
    if (!entry) return false;

    switch (action) {
      case 'READ':  return entry.canRead;
      case 'WRITE': return entry.canWrite;
      case 'DELETE': return entry.canDelete;
      default: return false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a team member
 */
export async function getUserPermissions(teamMemberId: string): Promise<PermissionEntry[]> {
  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      select: { permissions: true },
    });

    return parsePermissions(member?.permissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Apply a role preset to a team member
 */
export async function applyRolePreset(
  teamMemberId: string,
  roleName: string,
  _grantedBy: string
) {
  const preset = ROLE_PRESETS[roleName];
  if (!preset) {
    throw new Error(`Invalid role preset: ${roleName}`);
  }

  await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: { permissions: preset.permissions as any },
  });

  return preset.permissions;
}

/**
 * Grant / update a specific permission for a team member
 */
export async function grantPermission(
  teamMemberId: string,
  resource: PageResource,
  actions: {
    canRead?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
  },
  _grantedBy: string
) {
  const current = await getUserPermissions(teamMemberId);
  const idx = current.findIndex(p => p.resource === resource);

  const updated: PermissionEntry = {
    resource,
    canRead: actions.canRead ?? current[idx]?.canRead ?? false,
    canWrite: actions.canWrite ?? current[idx]?.canWrite ?? false,
    canDelete: actions.canDelete ?? current[idx]?.canDelete ?? false,
  };

  if (idx >= 0) {
    current[idx] = updated;
  } else {
    current.push(updated);
  }

  await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: { permissions: current as any },
  });

  return updated;
}

/**
 * Revoke all permissions for a team member
 */
export async function revokeAllPermissions(teamMemberId: string) {
  await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: { permissions: [] },
  });
}

/**
 * Check if user has admin session (for re-authentication)
 */
export async function hasValidAdminSession(userId: string): Promise<boolean> {
  try {
    const session = await prisma.adminSession.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !!session;
  } catch (error) {
    console.error('Error checking admin session:', error);
    return false;
  }
}

/**
 * Create admin session (after successful re-authentication)
 */
export async function createAdminSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const sessionToken = crypto.randomUUID();

  await prisma.adminSession.create({
    data: {
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return sessionToken;
}

/**
 * Invalidate admin session
 */
export async function invalidateAdminSession(sessionToken: string) {
  await prisma.adminSession.update({
    where: { sessionToken },
    data: { isActive: false },
  });
}

/**
 * Update admin session activity (extends timeout)
 */
export async function updateAdminSessionActivity(sessionToken: string) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.adminSession.update({
    where: { sessionToken },
    data: {
      lastActivity: new Date(),
      expiresAt,
    },
  });
}
