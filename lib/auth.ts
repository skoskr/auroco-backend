// lib/auth.ts
import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

// ---- Type augmentations (Session & JWT alanlarını genişlet) ----
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      currentOrgId?: string | null;
      role?: "OWNER" | "ADMIN" | "MEMBER" | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    currentOrgId?: string | null;
    role?: "OWNER" | "ADMIN" | "MEMBER" | null;
  }
}

// ---- NextAuth v4 config ----
export const authOptions: NextAuthOptions = {
  // Not: v4'te adapter paketi @next-auth/prisma-adapter
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, 

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // v4: buradan dönen değer token.user olarak taşınır
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
    
  ],

  callbacks: {
  async jwt({ token, user }) {
    if (user?.id) token.id = user.id as string;
    return token; // org/role’u session’da çekeceğiz
  },

  async session({ session, token }) {
    if (!session.user || !token?.id) return session;

    // DB’den güncel currentOrgId + role’u çek
    const userId = token.id as string;

    // 1) Kullanıcının currentOrgId’sini al
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentOrgId: true },
    });

    let currentOrgId = userRow?.currentOrgId ?? null;
    let role: "OWNER" | "ADMIN" | "MEMBER" | null = null;

    if (currentOrgId) {
      // 2) Mevcut org’da kullanıcının rolünü al
      const m = await prisma.membership.findUnique({
        where: { userId_orgId: { userId, orgId: currentOrgId } },
        select: { role: true },
      });
      role = (m?.role as any) ?? null;

      // 3) Kullanıcı bu org’un üyesi değilse fallback: ilk membership
      if (!role) {
        const first = await prisma.membership.findFirst({
          where: { userId },
          select: { orgId: true, role: true },
          orderBy: { id: "asc" },
        });
        currentOrgId = first?.orgId ?? null;
        role = (first?.role as any) ?? null;
      }
    } else {
      // Hiç currentOrgId yoksa: ilk membership
      const first = await prisma.membership.findFirst({
        where: { userId },
        select: { orgId: true, role: true },
        orderBy: { id: "asc" },
      });
      currentOrgId = first?.orgId ?? null;
      role = (first?.role as any) ?? null;
    }

    // Session’a yaz
    (session.user as any).id = userId;
    (session.user as any).currentOrgId = currentOrgId;
    (session.user as any).role = role;

    return session;
  },
},


  pages: {
    signIn: "/signin", // basit bir giriş formu
  },
};


export default NextAuth(authOptions);
