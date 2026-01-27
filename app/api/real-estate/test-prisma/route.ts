export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { 
  REFSBOStatus, 
  REPropertyType, 
  REAIEmployeeType,
  REListingStatus 
} from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const testEnums = {
      FSBOStatuses: Object.values(REFSBOStatus),
      PropertyTypes: Object.values(REPropertyType),
      AIEmployeeTypes: Object.values(REAIEmployeeType),
      ListingStatuses: Object.values(REListingStatus)
    };

    const modelCounts = {
      properties: await prisma.rEProperty.count({ where: { userId: session.user.id } }),
      fsboListings: await prisma.rEFSBOListing.count({ where: { assignedUserId: session.user.id } }),
      dncEntries: await prisma.rEDNCEntry.count({ where: { userId: session.user.id } }),
      cmaReports: await prisma.rECMAReport.count({ where: { userId: session.user.id } })
    };

    return NextResponse.json({
      success: true,
      message: 'Prisma RE types are working!',
      enums: testEnums,
      modelCounts
    });
  } catch (error: any) {
    console.error('RE Prisma test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
