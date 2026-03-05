import { z } from "zod";

export const CONTACT_TYPES = [
  "CUSTOMER",
  "PROSPECT",
  "PARTNER",
  "VENDOR",
  "OTHER",
] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "RESPONDED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

const trimmedString = z.string().trim();
const optionalTrimmed = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized.length ? normalized : undefined;
  });

export function normalizeContactType(
  value: unknown,
): (typeof CONTACT_TYPES)[number] {
  if (typeof value !== "string") return "CUSTOMER";
  const normalized = value.trim().toUpperCase();
  return (CONTACT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as (typeof CONTACT_TYPES)[number])
    : "CUSTOMER";
}

export function normalizeLeadStatus(
  value: unknown,
): (typeof LEAD_STATUSES)[number] {
  if (typeof value !== "string") return "NEW";
  const normalized = value.trim().toUpperCase();
  return (LEAD_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof LEAD_STATUSES)[number])
    : "NEW";
}

export function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 50);
  return [...new Set(normalized)];
}

export const contactCreateSchema = z
  .object({
    name: trimmedString.min(1).max(255),
    email: optionalTrimmed.refine(
      (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Invalid email address",
    ),
    phone: optionalTrimmed,
    company: optionalTrimmed,
    position: optionalTrimmed,
    address: optionalTrimmed,
    city: optionalTrimmed,
    state: optionalTrimmed,
    zipCode: optionalTrimmed,
    country: optionalTrimmed,
    dateOfBirth: optionalTrimmed,
    notes: optionalTrimmed.refine((value) => !value || value.length <= 10000),
    contactType: z.any().optional(),
    status: z.any().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Provide at least an email or phone number",
      });
    }

    if (value.dateOfBirth) {
      const date = new Date(value.dateOfBirth);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateOfBirth"],
          message: "Invalid dateOfBirth",
        });
      }
    }
  })
  .transform((value) => ({
    ...value,
    contactType: normalizeContactType(value.contactType),
    status: normalizeLeadStatus(value.status),
    dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth) : null,
  }));

export const contactUpdateSchema = z
  .object({
    businessName: optionalTrimmed,
    contactPerson: optionalTrimmed,
    email: optionalTrimmed.refine(
      (val) => !val || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val),
      "Invalid email address",
    ),
    phone: optionalTrimmed,
    website: optionalTrimmed,
    address: optionalTrimmed,
    city: optionalTrimmed,
    state: optionalTrimmed,
    zipCode: optionalTrimmed,
    country: optionalTrimmed,
    businessCategory: optionalTrimmed,
    status: z.any().optional(),
    source: optionalTrimmed,
    tags: z.any().optional(),
    contactType: z.any().optional(),
    dateOfBirth: optionalTrimmed,
    lastContactedAt: optionalTrimmed,
  })
  .transform((value) => ({
    ...(value.businessName !== undefined
      ? { businessName: value.businessName }
      : {}),
    ...(value.contactPerson !== undefined
      ? { contactPerson: value.contactPerson }
      : {}),
    ...(value.email !== undefined ? { email: value.email } : {}),
    ...(value.phone !== undefined ? { phone: value.phone } : {}),
    ...(value.website !== undefined ? { website: value.website } : {}),
    ...(value.address !== undefined ? { address: value.address } : {}),
    ...(value.city !== undefined ? { city: value.city } : {}),
    ...(value.state !== undefined ? { state: value.state } : {}),
    ...(value.zipCode !== undefined ? { zipCode: value.zipCode } : {}),
    ...(value.country !== undefined ? { country: value.country } : {}),
    ...(value.businessCategory !== undefined
      ? { businessCategory: value.businessCategory }
      : {}),
    ...(value.source !== undefined ? { source: value.source } : {}),
    ...(value.contactType !== undefined
      ? { contactType: normalizeContactType(value.contactType) }
      : {}),
    ...(value.status !== undefined
      ? { status: normalizeLeadStatus(value.status) }
      : {}),
    ...(value.tags !== undefined ? { tags: sanitizeTags(value.tags) } : {}),
    ...(value.dateOfBirth !== undefined
      ? { dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth) : null }
      : {}),
    ...(value.lastContactedAt !== undefined
      ? {
          lastContactedAt: value.lastContactedAt
            ? new Date(value.lastContactedAt)
            : null,
        }
      : {}),
  }));
