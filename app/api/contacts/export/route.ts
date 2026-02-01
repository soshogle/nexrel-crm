
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        website: true,
        businessCategory: true,
        contactType: true,
        status: true,
        tags: true,
        lastContactedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = [
      'Business Name',
      'Contact Person',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Zip Code',
      'Country',
      'Website',
      'Business Category',
      'Contact Type',
      'Status',
      'Tags',
      'Last Contacted',
      'Created Date',
    ];

    const csvRows = [headers.join(',')];

    contacts.forEach((contact: any) => {
      const tags = Array.isArray(contact.tags) ? contact.tags.join('; ') : '';
      const row = [
        contact.businessName || '',
        contact.contactPerson || '',
        contact.email || '',
        contact.phone || '',
        contact.address || '',
        contact.city || '',
        contact.state || '',
        contact.zipCode || '',
        contact.country || '',
        contact.website || '',
        contact.businessCategory || '',
        contact.contactType || '',
        contact.status || '',
        tags,
        contact.lastContactedAt
          ? new Date(contact.lastContactedAt).toLocaleDateString()
          : '',
        new Date(contact.createdAt).toLocaleDateString(),
      ];

      // Escape commas and quotes in values
      const escapedRow = row.map((value) => {
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });

      csvRows.push(escapedRow.join(','));
    });

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to export contacts' },
      { status: 500 }
    );
  }
}
