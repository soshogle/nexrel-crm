/**
 * Lab Order Integration Service
 * Handles integration with external lab systems for electronic order submission
 */

import { prisma } from '@/lib/db';

export interface LabSystemConfig {
  name: string;
  apiUrl: string;
  apiKey?: string;
  apiSecret?: string;
  supportsElectronicSubmission: boolean;
  supportsStatusTracking: boolean;
  supportsTrackingNumbers: boolean;
}

export interface LabOrderSubmission {
  orderNumber: string;
  labName: string;
  orderType: string;
  patientInfo: any;
  description?: string;
  instructions?: string;
  attachments?: any[];
  deliveryDate?: Date;
}

export interface LabOrderStatus {
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  notes?: string;
}

/**
 * Supported Lab Systems
 * Add more lab systems as integrations are developed
 */
export const SUPPORTED_LAB_SYSTEMS: Record<string, LabSystemConfig> = {
  'glidewell': {
    name: 'Glidewell Laboratories',
    apiUrl: process.env.GLIDEWELL_API_URL || 'https://api.glidewell.com',
    supportsElectronicSubmission: true,
    supportsStatusTracking: true,
    supportsTrackingNumbers: true,
  },
  'ivoclar': {
    name: 'Ivoclar Vivadent',
    apiUrl: process.env.IVOCLAR_API_URL || 'https://api.ivoclar.com',
    supportsElectronicSubmission: true,
    supportsStatusTracking: true,
    supportsTrackingNumbers: true,
  },
  'dentsply': {
    name: 'Dentsply Sirona',
    apiUrl: process.env.DENTSPLY_API_URL || 'https://api.dentsply.com',
    supportsElectronicSubmission: true,
    supportsStatusTracking: true,
    supportsTrackingNumbers: true,
  },
  'generic': {
    name: 'Generic Lab System',
    apiUrl: '',
    supportsElectronicSubmission: false,
    supportsStatusTracking: false,
    supportsTrackingNumbers: false,
  },
};

/**
 * Submit lab order to external lab system
 */
export async function submitLabOrderToExternalSystem(
  userId: string,
  orderId: string,
  labSystem: string
): Promise<{ success: boolean; trackingNumber?: string; error?: string }> {
  try {
    // Get lab order from database
    const order = await prisma.dentalLabOrder.findUnique({
      where: { id: orderId },
      include: {
        lead: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Lab order not found',
      };
    }

    const labConfig = SUPPORTED_LAB_SYSTEMS[labSystem.toLowerCase()];
    if (!labConfig) {
      return {
        success: false,
        error: `Lab system "${labSystem}" not supported`,
      };
    }

    if (!labConfig.supportsElectronicSubmission) {
      return {
        success: false,
        error: `Lab system "${labSystem}" does not support electronic submission`,
      };
    }

    // Get user's lab system credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { labSystemConfigs: true },
    });

    let apiKey: string | undefined;
    let apiSecret: string | undefined;

    if (user?.labSystemConfigs) {
      try {
        const configs = JSON.parse(user.labSystemConfigs);
        const systemConfig = configs[labSystem.toLowerCase()];
        if (systemConfig) {
          apiKey = systemConfig.apiKey;
          apiSecret = systemConfig.apiSecret;
        }
      } catch (error) {
        console.error('Error parsing lab system configs:', error);
      }
    }

    // If no API key, use environment variable
    if (!apiKey) {
      apiKey = process.env[`${labSystem.toUpperCase()}_API_KEY`];
      apiSecret = process.env[`${labSystem.toUpperCase()}_API_SECRET`];
    }

    if (!apiKey) {
      return {
        success: false,
        error: `API credentials not configured for ${labConfig.name}. Please configure in Settings.`,
      };
    }

    // Prepare submission data
    const submissionData: LabOrderSubmission = {
      orderNumber: order.orderNumber,
      labName: order.labName,
      orderType: order.orderType,
      patientInfo: order.patientInfo,
      description: order.description || undefined,
      instructions: order.instructions || undefined,
      attachments: order.attachments as any[] || undefined,
      deliveryDate: order.deliveryDate || undefined,
    };

    // Submit to lab system API
    const response = await fetch(`${labConfig.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(apiSecret && { 'X-API-Secret': apiSecret }),
      },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to submit order to ${labConfig.name}`,
      };
    }

    const result = await response.json();

    // Update order status
    await prisma.dentalLabOrder.update({
      where: { id: orderId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        trackingNumber: result.trackingNumber || order.trackingNumber,
      },
    });

    return {
      success: true,
      trackingNumber: result.trackingNumber,
    };

  } catch (error: any) {
    console.error('Error submitting lab order:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit lab order',
    };
  }
}

/**
 * Check lab order status from external system
 */
export async function checkLabOrderStatus(
  userId: string,
  orderId: string,
  labSystem: string
): Promise<{ success: boolean; status?: LabOrderStatus; error?: string }> {
  try {
    const order = await prisma.dentalLabOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        error: 'Lab order not found',
      };
    }

    const labConfig = SUPPORTED_LAB_SYSTEMS[labSystem.toLowerCase()];
    if (!labConfig || !labConfig.supportsStatusTracking) {
      return {
        success: false,
        error: `Status tracking not supported for ${labSystem}`,
      };
    }

    // Get API credentials (similar to submitLabOrderToExternalSystem)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { labSystemConfigs: true },
    });

    let apiKey: string | undefined;
    if (user?.labSystemConfigs) {
      try {
        const configs = JSON.parse(user.labSystemConfigs);
        const systemConfig = configs[labSystem.toLowerCase()];
        apiKey = systemConfig?.apiKey;
      } catch (error) {
        console.error('Error parsing lab system configs:', error);
      }
    }

    if (!apiKey) {
      apiKey = process.env[`${labSystem.toUpperCase()}_API_KEY`];
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'API credentials not configured',
      };
    }

    // Check status from lab system
    const response = await fetch(`${labConfig.apiUrl}/orders/${order.orderNumber}/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to check order status',
      };
    }

    const statusData = await response.json();

    // Map external status to our status enum
    const statusMap: Record<string, string> = {
      'pending': 'PENDING',
      'submitted': 'SUBMITTED',
      'received': 'RECEIVED',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED',
    };

    const mappedStatus = statusMap[statusData.status?.toLowerCase()] || order.status;

    // Update order in database
    const updateData: any = {
      status: mappedStatus,
    };

    if (statusData.trackingNumber) {
      updateData.trackingNumber = statusData.trackingNumber;
    }

    if (statusData.estimatedDelivery) {
      updateData.deliveryDate = new Date(statusData.estimatedDelivery);
    }

    if (mappedStatus === 'RECEIVED' && !order.receivedAt) {
      updateData.receivedAt = new Date();
    }

    if (mappedStatus === 'IN_PROGRESS' && !order.inProgressAt) {
      updateData.inProgressAt = new Date();
    }

    if (mappedStatus === 'COMPLETED' && !order.completedAt) {
      updateData.completedAt = new Date();
    }

    if (mappedStatus === 'DELIVERED' && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    await prisma.dentalLabOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    return {
      success: true,
      status: {
        orderNumber: order.orderNumber,
        status: mappedStatus,
        trackingNumber: statusData.trackingNumber,
        estimatedDelivery: statusData.estimatedDelivery ? new Date(statusData.estimatedDelivery) : undefined,
        notes: statusData.notes,
      },
    };

  } catch (error: any) {
    console.error('Error checking lab order status:', error);
    return {
      success: false,
      error: error.message || 'Failed to check order status',
    };
  }
}

/**
 * Get list of supported lab systems
 */
export function getSupportedLabSystems(): LabSystemConfig[] {
  return Object.values(SUPPORTED_LAB_SYSTEMS);
}

/**
 * Get lab system by ID
 */
export function getLabSystemById(id: string): LabSystemConfig | undefined {
  return SUPPORTED_LAB_SYSTEMS[id.toLowerCase()];
}

/**
 * Check if lab system supports electronic submission
 */
export function supportsElectronicSubmission(labSystem: string): boolean {
  const config = SUPPORTED_LAB_SYSTEMS[labSystem.toLowerCase()];
  return config?.supportsElectronicSubmission || false;
}
