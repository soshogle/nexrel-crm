import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getMetaDb } from "@/lib/db/meta-db";
import { resolveTenantOverrideEnvKey } from "@/lib/tenancy/tenant-registry";
import bcrypt from "bcryptjs";

// Auth uses Meta DB (Phase 3–4). When DATABASE_URL_META not set, falls back to DATABASE_URL.
const authDb = getMetaDb();

// Always register Google provider so the button shows. Uses env vars when set.
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authDb),
  providers: [
    // Only register Google provider when real credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== "placeholder" &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET !== "placeholder"
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const normalizedEmail = credentials?.email?.trim().toLowerCase();

        if (!normalizedEmail || !credentials?.password) {
          return null;
        }

        try {
          await authDb.$queryRaw`SELECT 1 as test`;
        } catch (dbError: any) {
          console.error("[AUTH] Database connection failed:", dbError.message);
          return null;
        }

        try {
          // Raw query to avoid Prisma schema mismatch (meta DB may have different columns)
          const rows = await authDb.$queryRaw<
            Array<{
              id: string;
              email: string;
              password: string;
              name: string | null;
              role: string;
              agencyId: string | null;
            }>
          >`
            SELECT id, email, password, name, role, "agencyId"
            FROM "User"
            WHERE LOWER(email) = LOWER(${normalizedEmail})
          `;
          const user = rows[0];
          if (!user?.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (!isPasswordValid) {
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            agencyId: user.agencyId,
            agencyName: null,
          };
        } catch (error: any) {
          console.error(
            "[AUTH] Error during authorize:",
            error?.message ?? error,
          );
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    async signOut({ token }) {
      try {
        // End ALL active impersonation sessions for this Super Admin
        await authDb.superAdminSession.updateMany({
          where: {
            superAdminId: token.id as string,
            isActive: true,
          },
          data: {
            isActive: false,
            endedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(
          "[AUTH] Error ending impersonation sessions during signout:",
          error,
        );
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (Google, etc.)
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await authDb.user.findUnique({
            where: { email: user.email },
            select: {
              id: true,
              accountStatus: true,
              createdAt: true,
              deletedAt: true,
            },
          });

          if (!existingUser) {
            return false;
          }

          // Block sign-in for soft-deleted users
          if (existingUser?.deletedAt) {
            return false;
          }

          // If user was just created (within last 5 seconds) and has default ACTIVE status, update to PENDING_APPROVAL
          if (existingUser) {
            const isNewUser =
              Date.now() - existingUser.createdAt.getTime() < 5000; // Created within last 5 seconds
            const hasDefaultStatus = existingUser.accountStatus === "ACTIVE";

            if (isNewUser && hasDefaultStatus) {
              await authDb.user.update({
                where: { id: existingUser.id },
                data: { accountStatus: "PENDING_APPROVAL" },
              });
            }
          }
        } catch (error) {
          console.error(
            "[AUTH] Error setting PENDING_APPROVAL for OAuth user:",
            error,
          );
        }
      }

      // Allow sign-in to continue (user will be redirected based on their status)
      return true;
    },
    async jwt({ token, user, account, trigger, session }): Promise<any> {
      // When client calls update({ industry }) after set-industry, merge into token
      if (trigger === "update" && session) {
        const newIndustry = session.industry ?? (session as any).user?.industry;
        if (newIndustry) token.industry = newIndustry;
      }

      const originalUserId = token.originalUserId || token.id;
      const wasImpersonating = token.isImpersonating === true;
      // Only run impersonation DB queries for super admins (or when resetting from impersonation)
      const shouldCheckImpersonation =
        originalUserId &&
        !user &&
        (token.originalUserIsSuperAdmin === true || wasImpersonating);

      if (shouldCheckImpersonation) {
        try {
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

          const impersonationSession = await authDb.superAdminSession.findFirst(
            {
              where: {
                superAdminId: originalUserId as string,
                isActive: true,
                lastActivity: { gte: fifteenMinutesAgo },
              },
              include: {
                impersonatedUser: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    agencyId: true,
                    parentRole: true,
                    industry: true,
                    onboardingCompleted: true,
                    accountStatus: true,
                    country: true,
                  },
                },
                superAdmin: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          );

          if (impersonationSession?.impersonatedUser) {
            await authDb.superAdminSession.update({
              where: { id: impersonationSession.id },
              data: { lastActivity: new Date() },
            });

            const impersonatedUser = impersonationSession.impersonatedUser;
            return {
              id: impersonatedUser.id,
              email: impersonatedUser.email,
              name: impersonatedUser.name,
              role: impersonatedUser.role,
              agencyId: impersonatedUser.agencyId,
              parentRole: impersonatedUser.parentRole || false,
              industry: impersonatedUser.industry,
              country: impersonatedUser.country || "CA",
              onboardingCompleted:
                impersonatedUser.onboardingCompleted || false,
              isImpersonating: true,
              superAdminId: impersonationSession.superAdminId,
              superAdminName: impersonationSession.superAdmin.name,
              originalUserId,
              originalUserIsSuperAdmin: true,
            };
          }

          if (wasImpersonating) {
            const superAdmin = await authDb.user.findUnique({
              where: { id: originalUserId as string },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                agencyId: true,
                parentRole: true,
                industry: true,
                onboardingCompleted: true,
                accountStatus: true,
                country: true,
              },
            });

            if (superAdmin) {
              return {
                id: superAdmin.id,
                email: superAdmin.email,
                name: superAdmin.name,
                role: superAdmin.role,
                agencyId: superAdmin.agencyId,
                parentRole: superAdmin.parentRole || false,
                industry: superAdmin.industry,
                country: superAdmin.country || "CA",
                onboardingCompleted: superAdmin.onboardingCompleted || false,
                isImpersonating: false,
                originalUserId: superAdmin.id,
                originalUserIsSuperAdmin: superAdmin.role === "SUPER_ADMIN",
              };
            }
            console.error(
              "[AUTH] Super admin not found when resetting impersonation:",
              originalUserId,
            );
          }
        } catch (error) {
          console.error("[AUTH] Error checking impersonation session:", error);
        }
      }

      if (user) {
        // For OAuth providers, the user.id might be in token.sub
        const userId = user.id || token.sub;

        if (userId) {
          try {
            // Fetch full user data to get role, parentRole, industry, and onboardingCompleted
            const dbUser = await authDb.user.findUnique({
              where: { id: userId as string },
              select: {
                id: true,
                role: true,
                agencyId: true,
                parentRole: true,
                industry: true,
                onboardingCompleted: true,
                accountStatus: true,
                country: true,
              },
            });

            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.agencyId = dbUser.agencyId;
              token.agencyName = user.agencyName as string | null;
              token.parentRole = dbUser.parentRole || false;
              token.industry = dbUser.industry;
              token.onboardingCompleted = dbUser.onboardingCompleted || false;
              token.accountStatus = dbUser.accountStatus;
              token.country = dbUser.country || "CA";
              token.isImpersonating = false;
              token.originalUserId = dbUser.id;
              token.originalUserIsSuperAdmin = dbUser.role === "SUPER_ADMIN";
            } else {
              token.id = userId as string;
              token.role = user.role || "USER";
              token.agencyId = user.agencyId as string | null;
              token.agencyName = user.agencyName as string | null;
              token.parentRole = false;
              token.industry = null;
              token.onboardingCompleted = false;
              token.originalUserId = userId as string;
              token.originalUserIsSuperAdmin = user.role === "SUPER_ADMIN";
            }
          } catch (error) {
            console.error("[AUTH] Error fetching user in JWT callback:", error);
            // Fallback on error
            token.id = userId as string;
            token.role = user.role || "USER";
            token.agencyId = user.agencyId as string | null;
            token.agencyName = user.agencyName as string | null;
            token.parentRole = false;
            token.industry = null;
            token.onboardingCompleted = false;
            token.originalUserId = userId as string;
            token.originalUserIsSuperAdmin = false;
          }
        }
      }

      if (!token.originalUserId) {
        token.originalUserId = token.id;
      }
      if (token.originalUserIsSuperAdmin === undefined) {
        token.originalUserIsSuperAdmin = token.role === "SUPER_ADMIN";
      }

      // Refresh industry from DB when token has none (e.g. DB was updated after login)
      const effectiveId = token.isImpersonating
        ? token.id
        : token.originalUserId || token.id;
      if (
        effectiveId &&
        (token.industry === null || token.industry === undefined) &&
        !user &&
        token.role !== "SUPER_ADMIN"
      ) {
        try {
          const dbUser = await authDb.user.findUnique({
            where: { id: effectiveId as string },
            select: {
              industry: true,
              onboardingCompleted: true,
              accountStatus: true,
              country: true,
            },
          });
          if (dbUser?.industry) {
            token.industry = dbUser.industry;
            token.onboardingCompleted =
              dbUser.onboardingCompleted ?? token.onboardingCompleted;
            token.accountStatus = dbUser.accountStatus ?? token.accountStatus;
            token.country = dbUser.country ?? token.country ?? "CA";
          }
        } catch {
          // Ignore - keep existing token
        }
      }

      const routingUserId = token.id as string | undefined;
      token.databaseEnvKey = routingUserId
        ? resolveTenantOverrideEnvKey(routingUserId)
        : null;

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          agencyId: token.agencyId as string | null,
          agencyName: token.agencyName as string | null,
          parentRole: token.parentRole as boolean,
          industry: token.industry as string | null,
          databaseEnvKey: token.databaseEnvKey as string | null,
          country: token.country as string | null,
          onboardingCompleted: token.onboardingCompleted as boolean,
          accountStatus: token.accountStatus as string,
          // Impersonation context
          isImpersonating: token.isImpersonating as boolean | undefined,
          superAdminId: token.superAdminId as string | undefined,
          superAdminName: token.superAdminName as string | undefined,
          originalUserIsSuperAdmin: token.originalUserIsSuperAdmin as
            | boolean
            | undefined,
        },
      };
    },
    async redirect({ url, baseUrl }) {
      // Allow any callback URLs that start with baseUrl
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // For external URLs, redirect to dashboard
      if (url.startsWith("http")) {
        return baseUrl + "/dashboard";
      }
      // Default to the provided URL
      return url;
    },
  },
};
