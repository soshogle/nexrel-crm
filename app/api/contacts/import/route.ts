
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importContactsFromCSV } from '@/lib/contacts-import';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return apiErrors.badRequest('File is required');
    }

    if (!file.name.endsWith('.csv')) {
      return apiErrors.badRequest('Only CSV files are allowed');
    }

    // Use the shared import function
    const result = await importContactsFromCSV(file, session.user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error importing contacts:', error);
    return apiErrors.internal('Failed to import contacts', error.message);
  }
}
