
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      company,
      position,
      address,
      city,
      state,
      zipCode,
      country,
      dateOfBirth,
      notes,
      contactType,
      status,
    } = body;

    console.log('Creating contact/lead with data:', { name, email, phone, company, notes });

    // Validation
    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Name and at least one of email or phone are required' },
        { status: 400 }
      );
    }

    // Create the contact as a Lead (notes will be added separately if provided)
    const contact = await prisma.lead.create({
      data: {
        userId: session.user.id,
        businessName: company || name, // Use name as fallback if no company provided
        contactPerson: name,
        email: email || null,
        phone: phone || null,
        website: null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        country: country || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        contactType: contactType || 'CUSTOMER',
        status: status || 'ACTIVE',
        source: 'Manual Entry',
        tags: [],
        // Create a note if notes are provided
        ...(notes && notes.trim() ? {
          notes: {
            create: {
              userId: session.user.id,
              content: notes.trim(),
            }
          }
        } : {})
      },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        status: true,
        contactType: true,
        tags: true,
        createdAt: true,
      },
    });

    console.log('Contact created successfully:', contact.id);

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create contact', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug logging
    console.log('=== CONTACTS API DEBUG ===');
    console.log('Session:', session ? 'exists' : 'null');
    console.log('Session.user:', session?.user ? 'exists' : 'null');
    console.log('Session.user.id:', session?.user?.id);
    console.log('Session.user.email:', session?.user?.email);
    
    if (!session?.user?.id) {
      console.log('ERROR: No user ID in session - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const tags = searchParams.get('tags');

    console.log('Querying contacts for userId:', session.user.id);
    
    const where: any = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && type !== 'all') {
      where.contactType = type;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    let contacts;
    try {
      contacts = await prisma.lead.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          contactPerson: true,
          email: true,
          phone: true,
          status: true,
          contactType: true,
          tags: true,
          lastContactedAt: true,
          dateOfBirth: true,
          createdAt: true,
          _count: {
            select: {
              deals: true,
              messages: true,
              callLogs: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      console.error('Database error code:', dbError?.code);
      console.error('Database error meta:', dbError?.meta);
      // Try without _count if that's causing the issue
      console.log('Retrying query without _count...');
      contacts = await prisma.lead.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          contactPerson: true,
          email: true,
          phone: true,
          status: true,
          contactType: true,
          tags: true,
          lastContactedAt: true,
          dateOfBirth: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      // Add empty counts manually
      contacts = contacts.map((contact: any) => ({
        ...contact,
        _count: {
          deals: 0,
          messages: 0,
          callLogs: 0,
        },
      }));
    }

    console.log('Contacts found:', contacts.length);

    // Filter by tags if provided
    let filteredContacts = contacts;
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      filteredContacts = contacts.filter((contact: any) => {
        const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
        return tagArray.some((tag) => contactTags.includes(tag));
      });
    }

    // Parse tags from JSON
    const parsedContacts = filteredContacts.map((contact: any) => ({
      ...contact,
      tags: Array.isArray(contact.tags) ? contact.tags : [],
    }));

    console.log('Returning', parsedContacts.length, 'contacts after filtering');

    return NextResponse.json(parsedContacts);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error name:', error?.name);
    return NextResponse.json(
      { 
        error: 'Failed to fetch contacts',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        type: error?.name
      },
      { status: 500 }
    );
  }
}
