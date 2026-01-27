
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importContactsFromCSV } from '@/lib/contacts-import';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    // Use the shared import function
    const result = await importContactsFromCSV(file, session.user.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { error: 'Failed to import contacts', details: error.message },
      { status: 500 }
    );
  }
}
