
import { prisma } from './db';
import { DeliveryStatus, DriverStatus, VehicleType } from '@prisma/client';

export interface CreateDeliveryOrderInput {
  userId: string;
  orderNumber?: string;
  orderValue: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryInstructions?: string;
  deliveryFee: number;
  scheduledPickupTime?: Date;
}

export interface UpdateDeliveryOrderInput {
  status?: DeliveryStatus;
  driverId?: string;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  distanceKm?: number;
  estimatedDurationMin?: number;
}

export interface CreateDriverInput {
  name: string;
  phone: string;
  email?: string;
  vehicleType?: VehicleType;
  licensePlate?: string;
  vehicleColor?: string;
  vehicleModel?: string;
  userId?: string;
}

export interface UpdateDriverInput {
  name?: string;
  email?: string;
  vehicleType?: VehicleType;
  licensePlate?: string;
  vehicleColor?: string;
  vehicleModel?: string;
  status?: DriverStatus;
  isAvailable?: boolean;
  isActive?: boolean;
}

export interface CreateDeliveryZoneInput {
  userId: string;
  name: string;
  description?: string;
  polygon: any; // GeoJSON polygon
  deliveryFee: number;
  minimumOrder: number;
  estimatedTimeMin: number;
}

export interface DriverLocationInput {
  driverId: string;
  deliveryOrderId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

// ===================================
// DELIVERY ORDER OPERATIONS
// ===================================

export async function createDeliveryOrder(input: CreateDeliveryOrderInput) {
  try {
    // Calculate commission
    const commissionAmount = (input.orderValue * 27.5) / 100; // 27.5% commission
    const driverEarnings = commissionAmount * 0.75; // Driver gets 75% of commission

    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        userId: input.userId,
        orderNumber: input.orderNumber,
        orderValue: input.orderValue,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        deliveryLat: input.deliveryLat,
        deliveryLng: input.deliveryLng,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        deliveryInstructions: input.deliveryInstructions,
        deliveryFee: input.deliveryFee,
        commissionAmount,
        driverEarnings,
        scheduledPickupTime: input.scheduledPickupTime,
        status: DeliveryStatus.PENDING,
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      order: deliveryOrder,
    };
  } catch (error: any) {
    console.error('Error creating delivery order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create delivery order',
    };
  }
}

export async function getDeliveryOrders(userId: string, filters?: {
  status?: DeliveryStatus;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.driverId) {
      where.driverId = filters.driverId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const orders = await prisma.deliveryOrder.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            rating: true,
          },
        },
        ratings: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      orders,
    };
  } catch (error: any) {
    console.error('Error fetching delivery orders:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch delivery orders',
    };
  }
}

export async function getDeliveryOrderById(orderId: string) {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehicleColor: true,
            vehicleModel: true,
            licensePlate: true,
            rating: true,
          },
        },
        ratings: true,
        locations: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Delivery order not found',
      };
    }

    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error fetching delivery order:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch delivery order',
    };
  }
}

export async function updateDeliveryOrder(orderId: string, input: UpdateDeliveryOrderInput) {
  try {
    const order = await prisma.deliveryOrder.update({
      where: { id: orderId },
      data: input,
      include: {
        driver: true,
      },
    });

    // If status changed to DELIVERED, update driver stats
    if (input.status === DeliveryStatus.DELIVERED && order.driverId) {
      await prisma.driver.update({
        where: { id: order.driverId },
        data: {
          totalDeliveries: {
            increment: 1,
          },
          totalEarnings: {
            increment: order.driverEarnings || 0,
          },
        },
      });

      // Record driver earnings
      if (order.driverEarnings && Number(order.driverEarnings) > 0) {
        await prisma.driverEarning.create({
          data: {
            driverId: order.driverId,
            amount: order.driverEarnings,
            description: `Delivery earnings for order ${order.orderNumber || order.id}`,
            type: 'delivery',
            referenceId: order.id,
          },
        });
      }
    }

    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error updating delivery order:', error);
    return {
      success: false,
      error: error.message || 'Failed to update delivery order',
    };
  }
}

export async function assignDriverToOrder(orderId: string, driverId: string) {
  try {
    const order = await prisma.deliveryOrder.update({
      where: { id: orderId },
      data: {
        driverId,
        status: DeliveryStatus.ASSIGNED,
      },
      include: {
        driver: true,
      },
    });

    // Update driver status to BUSY
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: DriverStatus.BUSY,
        isAvailable: false,
      },
    });

    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error assigning driver:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign driver',
    };
  }
}

export async function getDeliveryOrderByTracking(trackingCode: string) {
  try {
    const order = await prisma.deliveryOrder.findUnique({
      where: { trackingCode },
      include: {
        driver: {
          select: {
            name: true,
            phone: true,
            vehicleType: true,
            vehicleColor: true,
            vehicleModel: true,
            licensePlate: true,
            rating: true,
          },
        },
        locations: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: 'Delivery not found',
      };
    }

    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error tracking delivery:', error);
    return {
      success: false,
      error: error.message || 'Failed to track delivery',
    };
  }
}

// ===================================
// DRIVER OPERATIONS
// ===================================

export async function createDriver(input: CreateDriverInput) {
  try {
    // Check if driver with this phone already exists
    const existing = await prisma.driver.findUnique({
      where: { phone: input.phone },
    });

    if (existing) {
      return {
        success: false,
        error: 'Driver with this phone number already exists',
      };
    }

    const driver = await prisma.driver.create({
      data: {
        ...input,
        status: DriverStatus.OFFLINE,
        isAvailable: false,
      },
    });

    return {
      success: true,
      driver,
    };
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return {
      success: false,
      error: error.message || 'Failed to create driver',
    };
  }
}

export async function getDrivers(filters?: {
  isActive?: boolean;
  isAvailable?: boolean;
  status?: DriverStatus;
}) {
  try {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        deliveryOrders: {
          where: {
            status: {
              in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
            },
          },
        },
        _count: {
          select: {
            deliveryOrders: true,
            ratings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      drivers,
    };
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch drivers',
    };
  }
}

export async function getDriverById(driverId: string) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        deliveryOrders: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        earnings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        ratings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            deliveryOrders: true,
            ratings: true,
          },
        },
      },
    });

    if (!driver) {
      return {
        success: false,
        error: 'Driver not found',
      };
    }

    return {
      success: true,
      driver,
    };
  } catch (error: any) {
    console.error('Error fetching driver:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch driver',
    };
  }
}

export async function updateDriver(driverId: string, input: UpdateDriverInput) {
  try {
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: input,
    });

    return {
      success: true,
      driver,
    };
  } catch (error: any) {
    console.error('Error updating driver:', error);
    return {
      success: false,
      error: error.message || 'Failed to update driver',
    };
  }
}

export async function updateDriverLocation(input: DriverLocationInput) {
  try {
    const location = await prisma.driverLocation.create({
      data: input,
    });

    return {
      success: true,
      location,
    };
  } catch (error: any) {
    console.error('Error updating driver location:', error);
    return {
      success: false,
      error: error.message || 'Failed to update driver location',
    };
  }
}

export async function getDriverCurrentLocation(driverId: string) {
  try {
    const location = await prisma.driverLocation.findFirst({
      where: { driverId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      location,
    };
  } catch (error: any) {
    console.error('Error fetching driver location:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch driver location',
    };
  }
}

// ===================================
// DELIVERY ZONE OPERATIONS
// ===================================

export async function createDeliveryZone(input: CreateDeliveryZoneInput) {
  try {
    const zone = await prisma.deliveryZone.create({
      data: input,
    });

    return {
      success: true,
      zone,
    };
  } catch (error: any) {
    console.error('Error creating delivery zone:', error);
    return {
      success: false,
      error: error.message || 'Failed to create delivery zone',
    };
  }
}

export async function getDeliveryZones(userId: string) {
  try {
    const zones = await prisma.deliveryZone.findMany({
      where: { userId },
      include: {
        drivers: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                isAvailable: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      zones,
    };
  } catch (error: any) {
    console.error('Error fetching delivery zones:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch delivery zones',
    };
  }
}

export async function updateDeliveryZone(zoneId: string, input: Partial<CreateDeliveryZoneInput>) {
  try {
    const zone = await prisma.deliveryZone.update({
      where: { id: zoneId },
      data: input,
    });

    return {
      success: true,
      zone,
    };
  } catch (error: any) {
    console.error('Error updating delivery zone:', error);
    return {
      success: false,
      error: error.message || 'Failed to update delivery zone',
    };
  }
}

export async function assignDriverToZone(driverId: string, zoneId: string) {
  try {
    const assignment = await prisma.driverZone.create({
      data: {
        driverId,
        zoneId,
      },
    });

    return {
      success: true,
      assignment,
    };
  } catch (error: any) {
    // Check if already assigned
    if (error.code === 'P2002') {
      return {
        success: false,
        error: 'Driver already assigned to this zone',
      };
    }

    console.error('Error assigning driver to zone:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign driver to zone',
    };
  }
}

// ===================================
// RATING OPERATIONS
// ===================================

export async function createDeliveryRating(input: {
  deliveryOrderId: string;
  driverId: string;
  userId: string;
  rating: number;
  comment?: string;
  speedRating?: number;
  qualityRating?: number;
  serviceRating?: number;
}) {
  try {
    const rating = await prisma.deliveryRating.create({
      data: input,
    });

    // Update driver's overall rating
    const driverRatings = await prisma.deliveryRating.findMany({
      where: { driverId: input.driverId },
      select: { rating: true },
    });

    const averageRating =
      driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length;

    await prisma.driver.update({
      where: { id: input.driverId },
      data: {
        rating: averageRating,
      },
    });

    return {
      success: true,
      rating,
    };
  } catch (error: any) {
    console.error('Error creating delivery rating:', error);
    return {
      success: false,
      error: error.message || 'Failed to create rating',
    };
  }
}

export async function getDeliveryAnalytics(userId: string, period?: 'day' | 'week' | 'month') {
  try {
    const now = new Date();
    let startDate = new Date();

    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const orders = await prisma.deliveryOrder.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        driver: true,
        ratings: true,
      },
    });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === DeliveryStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((o) => o.status === DeliveryStatus.CANCELLED).length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.orderValue), 0);
    const totalCommission = orders.reduce((sum, o) => sum + Number(o.commissionAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      success: true,
      analytics: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        totalCommission,
        averageOrderValue,
        deliveryRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching delivery analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch analytics',
    };
  }
}
