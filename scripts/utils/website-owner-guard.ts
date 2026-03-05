import { prisma } from "@/lib/db";

export async function getOwnerUserIdOrThrow(
  ownerEmail: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: ownerEmail.trim().toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Owner user not found: ${ownerEmail}`);
  }

  return user.id;
}

export async function getWebsiteForOwnerOrThrow(params: {
  ownerEmail: string;
  websiteId?: string;
  nameContains?: string;
}) {
  const ownerUserId = await getOwnerUserIdOrThrow(params.ownerEmail);

  const website = await prisma.website.findFirst({
    where: {
      userId: ownerUserId,
      ...(params.websiteId ? { id: params.websiteId } : {}),
      ...(params.nameContains
        ? { name: { contains: params.nameContains, mode: "insensitive" } }
        : {}),
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!website) {
    throw new Error(
      `Website not found for owner ${params.ownerEmail}` +
        (params.websiteId ? ` and websiteId ${params.websiteId}` : "") +
        (params.nameContains
          ? ` and name containing ${params.nameContains}`
          : ""),
    );
  }

  if (website.userId !== ownerUserId) {
    throw new Error(
      `Ownership assertion failed. Website ${website.id} is not owned by ${params.ownerEmail}`,
    );
  }

  return website;
}
