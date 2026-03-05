/**
 * Request validation helper using Zod.
 * 
 * Usage in an API route:
 *   import { validateBody } from '@/lib/validate';
 *   import { z } from 'zod';
 *
 *   const schema = z.object({ name: z.string().min(1), email: z.string().email() });
 *   const result = await validateBody(request, schema);
 *   if (!result.ok) return result.error;   // returns 400 with validation details
 *   const { name, email } = result.data;
 *
 * Also exports shared Zod schemas for common shapes (contact, campaign, payment).
 */

import { NextRequest } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { apiErrors } from '@/lib/api-error';

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: ReturnType<typeof apiErrors.validationError> };

/**
 * Parse and validate the JSON body of a Next.js API request against a Zod schema.
 * Returns a discriminated union — check `.ok` before accessing `.data`.
 */
export async function validateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>,
): Promise<ValidationSuccess<T> | ValidationFailure> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return {
            ok: false,
            error: apiErrors.badRequest('Request body must be valid JSON'),
        };
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        return {
            ok: false,
            error: apiErrors.validationError('Validation failed', formatZodErrors(result.error)),
        };
    }

    return { ok: true, data: result.data };
}

/**
 * Parse and validate query parameters against a Zod schema.
 */
export function validateQuery<T>(
    searchParams: URLSearchParams,
    schema: ZodSchema<T>,
): ValidationSuccess<T> | ValidationFailure {
    const raw = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(raw);
    if (!result.success) {
        return {
            ok: false,
            error: apiErrors.validationError('Invalid query parameters', formatZodErrors(result.error)),
        };
    }
    return { ok: true, data: result.data };
}

function formatZodErrors(error: ZodError) {
    return error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
    }));
}

// ─────────────────────────────────────────────────────────
// Shared Zod schemas — import from here rather than
// redefining the same shapes in every route file.
// ─────────────────────────────────────────────────────────

/** E.164 phone number (optional) */
const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number').optional();

/** Common pagination */
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Contact create/update */
export const contactSchema = z.object({
    contactPerson: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: phoneSchema,
    company: z.string().max(255).optional(),
    notes: z.string().max(10_000).optional(),
    tags: z.array(z.string().max(100)).max(50).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Contact tag filter */
export const contactQuerySchema = paginationSchema.extend({
    search: z.string().max(255).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    tag: z.string().max(100).optional(),
});

/** Campaign create */
export const campaignSchema = z.object({
    name: z.string().min(1, 'Campaign name is required').max(255),
    type: z.enum(['SMS', 'EMAIL', 'VOICE', 'DRIP']),
    subject: z.string().max(998).optional(),
    body: z.string().min(1, 'Message body is required').max(160_000),
    scheduledAt: z.string().datetime().optional(),
    contactIds: z.array(z.string().cuid()).min(1, 'At least one contact required').optional(),
    tagFilter: z.string().max(100).optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

/** Payment / checkout */
export const paymentIntentSchema = z.object({
    amount: z.number().int().positive('Amount must be positive'),
    currency: z.string().length(3, 'Must be a 3-letter ISO currency code').default('usd'),
    description: z.string().max(500).optional(),
    metadata: z.record(z.string()).optional(),
});

export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;

/** Appointment booking */
export const appointmentSchema = z.object({
    appointmentDate: z.string().datetime('Invalid appointment date'),
    appointmentTypeId: z.string().cuid().optional(),
    customerName: z.string().min(1).max(255),
    customerPhone: phoneSchema,
    customerEmail: z.string().email().optional().or(z.literal('')),
    notes: z.string().max(5_000).optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

/** Generic ID param (for route handlers that only need to validate an ID) */
export const idParamSchema = z.object({
    id: z.string().cuid('Invalid ID format'),
});
