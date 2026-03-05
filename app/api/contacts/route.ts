import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService, getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";
import {
  contactCreateSchema,
  LEAD_STATUSES,
  sanitizeTags,
} from "@/lib/contact-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json().catch(() => null);
    const parseResult = contactCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validationError(
        "Invalid contact payload",
        parseResult.error.flatten(),
      );
    }

    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      state,
      zipCode,
      country,
      dateOfBirth,
      notes,
      contactType,
      status,
    } = parseResult.data;
    const notesText = notes || "";

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
      dateOfBirth,
      contactType: contactType || "CUSTOMER",
      status: status || "NEW",
      source: "Manual Entry",
      tags: [],
      ...(notesText
        ? ({
            notes: {
              create: {
                userId: ctx.userId,
                content: notesText,
              },
            },
          } as any)
        : {}),
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contact:", error.message);
    return apiErrors.internal("Failed to create contact");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const tags = searchParams.get("tags");

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const pagination = parsePagination(request);
    const db = getCrmDb(ctx);
    const where: any = { userId: ctx.userId };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && type !== "all") {
      const normalizedType = type.toUpperCase();
      const allowedTypes = new Set(["CUSTOMER", "PROSPECT", "PARTNER"]);
      if (allowedTypes.has(normalizedType)) {
        where.contactType = normalizedType;
      }
    }

    if (status && status !== "all") {
      const normalizedStatus = status.toUpperCase();
      if ((LEAD_STATUSES as readonly string[]).includes(normalizedStatus)) {
        where.status = normalizedStatus;
      }
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
        orderBy: { createdAt: "desc" },
        take: pagination.take,
        skip: pagination.skip,
      });

      if (contacts.length > 0) {
        const contactIds = contacts.map((c: any) => c.id);

        const [dealsData, messagesData, callLogsData] = await Promise.all([
          db.deal
            .findMany({
              where: { leadId: { in: contactIds } },
              select: { leadId: true },
            })
            .catch(() => []),
          db.message
            .findMany({
              where: { leadId: { in: contactIds } },
              select: { leadId: true },
            })
            .catch(() => []),
          db.callLog
            .findMany({
              where: { leadId: { in: contactIds } },
              select: { leadId: true },
            })
            .catch(() => []),
        ]);

        // Count manually - filter out null leadIds
        const dealsMap = new Map<string, number>();
        const messagesMap = new Map<string, number>();
        const callLogsMap = new Map<string, number>();

        dealsData
          .filter((d) => d.leadId !== null)
          .forEach((d) =>
            dealsMap.set(d.leadId!, (dealsMap.get(d.leadId!) || 0) + 1),
          );
        messagesData
          .filter((m) => m.leadId !== null)
          .forEach((m) =>
            messagesMap.set(m.leadId!, (messagesMap.get(m.leadId!) || 0) + 1),
          );
        callLogsData
          .filter((c) => c.leadId !== null)
          .forEach((c) =>
            callLogsMap.set(c.leadId!, (callLogsMap.get(c.leadId!) || 0) + 1),
          );

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
      console.error("Database query error:", dbError?.code);
      contacts = [];
    }

    // Filter by tags if provided
    let filteredContacts = contacts;
    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      filteredContacts = contacts.filter((contact: any) => {
        const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
        return tagArray.some((tag) => contactTags.includes(tag));
      });
    }

    // Parse tags from JSON
    const parsedContacts = filteredContacts.map((contact: any) => ({
      ...contact,
      tags: sanitizeTags(contact.tags),
    }));

    const total = await leadService.count(ctx, where);

    const isOrthoDemo =
      String(session.user.email || "")
        .toLowerCase()
        .trim() === "orthodontist@nexrel.com";
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && parsedContacts.length === 0 && total === 0) {
      const { MOCK_CONTACTS } = await import("@/lib/mock-data");
      const mockContacts = MOCK_CONTACTS.map((c) => ({
        ...c,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
      return paginatedResponse(
        mockContacts,
        mockContacts.length,
        pagination,
        "contacts",
      );
    }

    return paginatedResponse(parsedContacts, total, pagination, "contacts");
  } catch (error: any) {
    console.error("Error fetching contacts:", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
