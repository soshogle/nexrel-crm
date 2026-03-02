import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

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

    if (!name || (!email && !phone)) {
      return apiErrors.badRequest('Name and at least one of email or phone are required');
    }

    const contact = await leadService.create(ctx, {
      businessName: company || name,
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
      ...(notes && notes.trim() ? {
        notes: {
          create: {
            userId: ctx.userId,
            content: notes.trim(),
          },
        },
      } as any : {}),
    });

    console.log('Contact created successfully:', contact.id);

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return apiErrors.internal('Failed to create contact', error.message);
  }
}

export async function GET(request: NextRequest) {
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
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const tags = searchParams.get('tags');

    console.log('Querying contacts for userId:', session.user.id);
    
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const pagination = parsePagination(request);
    const db = getCrmDb(ctx);
    const where: any = { userId: ctx.userId };

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
      contacts = await leadService.findMany(ctx, {
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
          createdAt: true,
        } as any,
        orderBy: { createdAt: 'desc' },
        take: pagination.take,
        skip: pagination.skip,
      });

      if (contacts.length > 0) {
        const contactIds = contacts.map((c: any) => c.id);
        
        const [dealsData, messagesData, callLogsData] = await Promise.all([
          db.deal.findMany({
            where: { leadId: { in: contactIds } },
            select: { leadId: true },
          }).catch(() => []),
          db.message.findMany({
            where: { leadId: { in: contactIds } },
            select: { leadId: true },
          }).catch(() => []),
          db.callLog.findMany({
            where: { leadId: { in: contactIds } },
            select: { leadId: true },
          }).catch(() => []),
        ]);

        // Count manually - filter out null leadIds
        const dealsMap = new Map<string, number>();
        const messagesMap = new Map<string, number>();
        const callLogsMap = new Map<string, number>();

        dealsData
          .filter(d => d.leadId !== null)
          .forEach(d => dealsMap.set(d.leadId!, (dealsMap.get(d.leadId!) || 0) + 1));
        messagesData
          .filter(m => m.leadId !== null)
          .forEach(m => messagesMap.set(m.leadId!, (messagesMap.get(m.leadId!) || 0) + 1));
        callLogsData
          .filter(c => c.leadId !== null)
          .forEach(c => callLogsMap.set(c.leadId!, (callLogsMap.get(c.leadId!) || 0) + 1));

        // Add counts to contacts
        contacts = contacts.map((contact: any) => ({
          ...contact,
          _count: {
            deals: dealsMap.get(contact.id) || 0,
            messages: messagesMap.get(contact.id) || 0,
            callLogs: callLogsMap.get(contact.id) || 0,
          },
        }));
      } else {
        // No contacts, add empty counts
        contacts = contacts.map((contact: any) => ({
          ...contact,
          _count: {
            deals: 0,
            messages: 0,
            callLogs: 0,
          },
        }));
      }
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      console.error('Database error code:', dbError?.code);
      console.error('Database error meta:', dbError?.meta);
      // Return empty array on error
      contacts = [];
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

    const total = await leadService.count(ctx, where);

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && parsedContacts.length === 0 && total === 0) {
      const { MOCK_CONTACTS } = await import('@/lib/mock-data');
      const mockContacts = MOCK_CONTACTS.map((c) => ({
        ...c,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
      return paginatedResponse(mockContacts, mockContacts.length, pagination, 'contacts');
    }

    return paginatedResponse(parsedContacts, total, pagination, 'contacts');
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
