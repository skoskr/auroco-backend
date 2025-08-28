// lib/authz.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  return session;
}

export async function resolveCurrentOrgId(req: Request) {
  const fromHeader = req.headers.get("x-org-id");
  if (fromHeader) return fromHeader;

  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { currentOrgId: true },
  });
  if (user?.currentOrgId) return user.currentOrgId;

  const mem = await prisma.membership.findFirst({
    where: { userId: uid, status: "ACTIVE" },
    select: { orgId: true },
  });
  return mem?.orgId ?? null;
}

export async function getMembership(userId: string, orgId: string) {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true, status: true },
  });
}

export async function requireMembership(orgId: string) {
  const session = await requireAuth();
  const mem = await getMembership(session.user.id, orgId);
  if (!mem || mem.status !== "ACTIVE") {
    throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  return { session, membership: mem };
}

export async function requireRole(orgId: string, roles: UserRole[]) {
  const ctx = await requireMembership(orgId);
  if (!roles.includes(ctx.membership.role as UserRole)) {
    throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  return ctx;
}

export async function requireSelfOrRole(
  orgId: string,
  targetUserId: string,
  roles: UserRole[] = ["ADMIN", "OWNER"]
) {
  const { session, membership } = await requireMembership(orgId);
  const isSelf = session.user.id === targetUserId;
  const privileged = roles.includes(membership.role as UserRole);
  if (!isSelf && !privileged) {
    throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  return { session, membership };
}

export async function ensureOwnerIsNotLast(orgId: string, targetUserId: string) {
  const target = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: targetUserId, orgId } },
    select: { role: true },
  });
  if (target?.role !== "OWNER") return;

  const ownerCount = await prisma.membership.count({
    where: { orgId, role: "OWNER", status: "ACTIVE" },
  });
  if (ownerCount <= 1) {
    throw new Response(JSON.stringify({ error: "last_owner_protection" }), { status: 409 });
  }
}
