
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-google-client-secret',
      // Enable account linking for users with verified emails
      // This allows users who signed up with email/password to link their Google account
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const normalizedEmail = credentials?.email?.trim().toLowerCase()
        console.log('[AUTH DEBUG] authorize() called with email:', normalizedEmail)
        
        if (!normalizedEmail || !credentials?.password) {
          console.log('[AUTH DEBUG] Missing email or password')
          return null
        }

        try {
          console.log('[AUTH DEBUG] Querying database for user:', normalizedEmail)
          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail
            },
            include: {
              agency: true
            }
          })

          console.log('[AUTH DEBUG] User found:', !!user, 'Has password:', !!user?.password)

          if (!user || !user.password) {
            console.log('[AUTH DEBUG] User not found or no password set')
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          console.log('[AUTH DEBUG] Password valid:', isPasswordValid)

          if (!isPasswordValid) {
            console.log('[AUTH DEBUG] Invalid password')
            return null
          }

          console.log('[AUTH DEBUG] Login successful for user:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            agencyId: user.agencyId,
            agencyName: user.agency?.name,
          }
        } catch (error) {
          console.error('[AUTH DEBUG] Error during authorize:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin'
  },
  events: {
    async signOut({ token }) {
      console.log('🚪 SignOut event - Ending any active impersonation sessions for user:', token.id);
      
      try {
        // End ALL active impersonation sessions for this Super Admin
        await prisma.superAdminSession.updateMany({
          where: {
            superAdminId: token.id as string,
            isActive: true
          },
          data: {
            isActive: false,
            endedAt: new Date()
          }
        });
        
        console.log('✅ All impersonation sessions ended for user:', token.id);
      } catch (error) {
        console.error('❌ Error ending impersonation sessions during signout:', error);
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (Google, etc.), check if this is a new user and set to PENDING_APPROVAL
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, accountStatus: true, createdAt: true }
          });
          
          // If user was just created (within last 5 seconds) and has default ACTIVE status, update to PENDING_APPROVAL
          if (existingUser) {
            const isNewUser = (Date.now() - existingUser.createdAt.getTime()) < 5000; // Created within last 5 seconds
            const hasDefaultStatus = existingUser.accountStatus === 'ACTIVE';
            
            if (isNewUser && hasDefaultStatus) {
              console.log('🆕 New Google OAuth user detected, setting to PENDING_APPROVAL:', user.email);
              
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { accountStatus: 'PENDING_APPROVAL' }
              });
              
              console.log('✅ User status updated to PENDING_APPROVAL for:', user.email);
            }
          }
        } catch (error) {
          console.error('❌ Error setting PENDING_APPROVAL for OAuth user:', error);
        }
      }
      
      // Allow sign-in to continue (user will be redirected based on their status)
      return true;
    },
    async jwt({ token, user, account, trigger, session }): Promise<any> {
      console.log('🔧 JWT Callback triggered -', { 
        trigger, 
        hasUser: !!user, 
        tokenId: token.id,
        sessionData: session 
      });
      
      // ALWAYS check for active impersonation first, regardless of trigger
      // Store the original token.id (Super Admin ID) before any modifications
      const originalUserId = token.originalUserId || token.id;
      const wasImpersonating = token.isImpersonating === true;
      
      console.log('🔍 JWT Callback - Starting impersonation check:', {
        trigger,
        hasUser: !!user,
        originalUserId,
        tokenId: token.id,
        tokenIsImpersonating: token.isImpersonating,
        wasImpersonating,
        forcedRefresh: session?.trigger === 'checkImpersonation',
      });
      
      // Only check for impersonation if we don't have fresh user data (i.e., not a new login)
      // On fresh login, 'user' will be present and we should use that instead
      if (originalUserId && !user) {
        try {
          // Check if the user (Super Admin) has an active impersonation session
          // Session is valid if it's active and last activity was within 15 minutes
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
          
          console.log('🔍 Querying for impersonation session:', {
            superAdminId: originalUserId,
            cutoffTime: fifteenMinutesAgo.toISOString(),
          });
          
          // First, let's see ALL sessions for this admin to debug
          const allSessions = await prisma.superAdminSession.findMany({
            where: {
              superAdminId: originalUserId as string,
            },
            orderBy: { startedAt: 'desc' },
            take: 5,
          });
          
          console.log('🔍 ALL sessions for this admin:', {
            count: allSessions.length,
            sessions: allSessions.map(s => ({
              id: s.id,
              isActive: s.isActive,
              lastActivity: s.lastActivity?.toISOString(),
              startedAt: s.startedAt.toISOString(),
              impersonatedUserId: s.impersonatedUserId,
            }))
          });
          
          const impersonationSession = await prisma.superAdminSession.findFirst({
            where: {
              superAdminId: originalUserId as string,
              isActive: true,
              lastActivity: {
                gte: fifteenMinutesAgo
              }
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
                }
              },
              superAdmin: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                }
              }
            }
          });

          console.log('🔍 Impersonation session query result:', {
            found: !!impersonationSession,
            sessionId: impersonationSession?.id,
            isActive: impersonationSession?.isActive,
            lastActivity: impersonationSession?.lastActivity?.toISOString(),
            superAdminId: impersonationSession?.superAdminId,
            impersonatedUserId: impersonationSession?.impersonatedUserId,
          });

          if (impersonationSession?.impersonatedUser) {
            // ✅ UPDATE LAST ACTIVITY TO KEEP SESSION ALIVE
            await prisma.superAdminSession.update({
              where: { id: impersonationSession.id },
              data: { lastActivity: new Date() },
            });
            console.log('✅ Updated lastActivity for impersonation session');
            
            // User is impersonating - return impersonated user's data
            const impersonatedUser = impersonationSession.impersonatedUser;
            console.log('✅✅✅ IMPERSONATION ACTIVE - RETURNING EARLY WITH IMPERSONATED USER DATA ✅✅✅');
            console.log('✅ Impersonation active - returning impersonated user data:', {
              superAdminId: impersonationSession.superAdminId,
              superAdminEmail: impersonationSession.superAdmin.email,
              impersonatedUserId: impersonatedUser.id,
              impersonatedUserEmail: impersonatedUser.email,
              impersonatedUserName: impersonatedUser.name,
              isImpersonating: true,
            });

            const impersonatedToken = {
              id: impersonatedUser.id,
              email: impersonatedUser.email,
              name: impersonatedUser.name,
              role: impersonatedUser.role,
              agencyId: impersonatedUser.agencyId,
              parentRole: impersonatedUser.parentRole || false,
              industry: impersonatedUser.industry,
              onboardingCompleted: impersonatedUser.onboardingCompleted || false,
              // Store impersonation context for display
              isImpersonating: true,
              superAdminId: impersonationSession.superAdminId,
              superAdminName: impersonationSession.superAdmin.name,
              // Keep track of original user ID (Super Admin)
              originalUserId: originalUserId,
            };
            
            console.log('✅ Token being returned:', JSON.stringify(impersonatedToken, null, 2));
            return impersonatedToken;
          } else if (wasImpersonating) {
            // 🔄 Impersonation was active but is no longer - reset to super admin
            console.log('🔄 Impersonation ended - resetting session to super admin');
            
            // Fetch the super admin's data to reset the token
            const superAdmin = await prisma.user.findUnique({
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
              },
            });

            if (superAdmin) {
              console.log('✅ Reset to super admin:', {
                id: superAdmin.id,
                email: superAdmin.email,
                name: superAdmin.name,
                role: superAdmin.role,
              });

              return {
                id: superAdmin.id,
                email: superAdmin.email,
                name: superAdmin.name,
                role: superAdmin.role,
                agencyId: superAdmin.agencyId,
                parentRole: superAdmin.parentRole || false,
                industry: superAdmin.industry,
                onboardingCompleted: superAdmin.onboardingCompleted || false,
                isImpersonating: false,
                originalUserId: superAdmin.id,
              };
            } else {
              console.error('❌ Super admin not found in database:', originalUserId);
            }
          } else {
            console.log('❌ No active impersonation session found - continuing with regular flow');
          }
        } catch (error) {
          console.error('❌ Error checking impersonation session:', error);
        }
      } else if (user) {
        console.log('🆕 Fresh login detected - user object present, skipping impersonation check');
      }

      if (user) {
        // For OAuth providers, the user.id might be in token.sub
        const userId = user.id || token.sub
        
        if (userId) {
          try {
            // Fetch full user data to get role, parentRole, industry, and onboardingCompleted
            const dbUser = await prisma.user.findUnique({
              where: { id: userId as string },
              select: {
                id: true,
                role: true,
                agencyId: true,
                parentRole: true,
                industry: true,
                onboardingCompleted: true,
                accountStatus: true,
              },
            })

            if (dbUser) {
              token.id = dbUser.id
              token.role = dbUser.role
              token.agencyId = dbUser.agencyId
              token.agencyName = user.agencyName as string | null
              token.parentRole = dbUser.parentRole || false
              token.industry = dbUser.industry
              token.onboardingCompleted = dbUser.onboardingCompleted || false
              token.accountStatus = dbUser.accountStatus
              token.isImpersonating = false
              token.originalUserId = dbUser.id // Store original user ID for impersonation tracking
            } else {
              // Fallback if user not found
              token.id = userId as string
              token.role = user.role || 'USER'
              token.agencyId = user.agencyId as string | null
              token.agencyName = user.agencyName as string | null
              token.parentRole = false
              token.industry = null
              token.onboardingCompleted = false
              token.originalUserId = userId as string
            }
          } catch (error) {
            console.error('Error fetching user in JWT callback:', error)
            // Fallback on error
            token.id = userId as string
            token.role = user.role || 'USER'
            token.agencyId = user.agencyId as string | null
            token.agencyName = user.agencyName as string | null
            token.parentRole = false
            token.industry = null
            token.onboardingCompleted = false
            token.originalUserId = userId as string
          }
        }
      }

      // Ensure originalUserId is always set for impersonation tracking
      if (!token.originalUserId) {
        token.originalUserId = token.id
      }

      console.log('🔧 JWT Callback complete - Final token state:', {
        tokenId: token.id,
        originalUserId: token.originalUserId,
        isImpersonating: token.isImpersonating || false,
      })

      return token
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
          onboardingCompleted: token.onboardingCompleted as boolean,
          accountStatus: token.accountStatus as string,
          // Impersonation context
          isImpersonating: token.isImpersonating as boolean | undefined,
          superAdminId: token.superAdminId as string | undefined,
          superAdminName: token.superAdminName as string | undefined,
        }
      }
    },
    async redirect({ url, baseUrl }) {
      // Allow any callback URLs that start with baseUrl
      if (url.startsWith(baseUrl)) {
        return url
      }
      // For external URLs, redirect to dashboard
      if (url.startsWith('http')) {
        return baseUrl + '/dashboard'
      }
      // Default to the provided URL
      return url
    },
  }
}
