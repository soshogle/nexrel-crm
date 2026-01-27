
/**
 * Permissions & Access Control System
 * 
 * This library provides utilities for checking and managing user permissions
 * across the CRM platform.
 */

import { prisma } from '@/lib/db';
import { PageResource, PermissionAction } from '@prisma/client';

// Role presets - define default permissions for each role
export const ROLE_PRESETS = {
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
      const isAgentResource = agentResources.includes(resource);
      
      return {
        resource,
        canRead: isAgentResource,
        canWrite: isAgentResource,
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

/**
 * Check if a user has a specific permission for a resource
 */
export async function hasPermission(
  userId: string,
  resource: PageResource,
  action: 'READ' | 'WRITE' | 'DELETE'
): Promise<boolean> {
  try {
    const permission = await prisma.userPermission.findUnique({
      where: {
        userId_resource: {
          userId,
          resource,
        },
      },
    });

    if (!permission) {
      // No explicit permission set - deny access
      return false;
    }

    // Check if permission is expired
    if (permission.expiresAt && permission.expiresAt < new Date()) {
      return false;
    }

    // Check specific action
    switch (action) {
      case 'READ':
        return permission.canRead;
      case 'WRITE':
        return permission.canWrite;
      case 'DELETE':
        return permission.canDelete;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string) {
  try {
    const permissions = await prisma.userPermission.findMany({
      where: { userId },
      orderBy: { resource: 'asc' },
    });

    return permissions;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Apply a role preset to a user
 */
export async function applyRolePreset(
  userId: string,
  roleName: keyof typeof ROLE_PRESETS,
  grantedBy: string
) {
  try {
    const preset = ROLE_PRESETS[roleName];
    if (!preset) {
      throw new Error(`Invalid role preset: ${roleName}`);
    }

    // Delete existing permissions
    await prisma.userPermission.deleteMany({
      where: { userId },
    });

    // Create new permissions based on preset
    const permissions = await prisma.userPermission.createMany({
      data: preset.permissions.map(p => ({
        userId,
        resource: p.resource,
        canRead: p.canRead,
        canWrite: p.canWrite,
        canDelete: p.canDelete,
        grantedBy,
      })),
    });

    return permissions;
  } catch (error) {
    console.error('Error applying role preset:', error);
    throw error;
  }
}

/**
 * Grant specific permission to a user
 */
export async function grantPermission(
  userId: string,
  resource: PageResource,
  actions: {
    canRead?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
  },
  grantedBy: string
) {
  try {
    const permission = await prisma.userPermission.upsert({
      where: {
        userId_resource: {
          userId,
          resource,
        },
      },
      create: {
        userId,
        resource,
        canRead: actions.canRead ?? false,
        canWrite: actions.canWrite ?? false,
        canDelete: actions.canDelete ?? false,
        grantedBy,
      },
      update: {
        canRead: actions.canRead ?? undefined,
        canWrite: actions.canWrite ?? undefined,
        canDelete: actions.canDelete ?? undefined,
        grantedBy,
      },
    });

    return permission;
  } catch (error) {
    console.error('Error granting permission:', error);
    throw error;
  }
}

/**
 * Revoke all permissions for a user
 */
export async function revokeAllPermissions(userId: string) {
  try {
    await prisma.userPermission.deleteMany({
      where: { userId },
    });
  } catch (error) {
    console.error('Error revoking permissions:', error);
    throw error;
  }
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
  try {
    // Admin sessions expire after 15 minutes
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
  } catch (error) {
    console.error('Error creating admin session:', error);
    throw error;
  }
}

/**
 * Invalidate admin session
 */
export async function invalidateAdminSession(sessionToken: string) {
  try {
    await prisma.adminSession.update({
      where: { sessionToken },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Error invalidating admin session:', error);
    throw error;
  }
}

/**
 * Update admin session activity (extends timeout)
 */
export async function updateAdminSessionActivity(sessionToken: string) {
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.adminSession.update({
      where: { sessionToken },
      data: {
        lastActivity: new Date(),
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Error updating admin session activity:', error);
    throw error;
  }
}
