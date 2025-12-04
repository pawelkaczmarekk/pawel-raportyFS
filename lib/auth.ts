import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Gmail send scope + standard profile scopes
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
          // Force consent screen and request offline access for refresh token
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Check if email ends with allowed domain
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || 'vsprint';

      if (user.email && user.email.toLowerCase().includes(allowedDomain.toLowerCase())) {
        return true;
      }

      return false; // Deny access if domain doesn't match
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // Pass OAuth tokens to session
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.expiresAt = token.expiresAt as number;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in - store OAuth tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      if (user) {
        token.id = user.id;
      }

      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};
