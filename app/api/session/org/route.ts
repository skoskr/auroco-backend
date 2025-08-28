// app/api/session/org/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveCurrentOrgId } from "@/lib/authz";
import type { UserRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// Basit rol → izin haritası (frontend'e hızlıca servis)
function permissionsFor(role: UserRole) {
  switch (role) {
    case "OWNER":
      return [
        "org.read",
        "org.update",
        "members.list",
        "members.invite",
        "members.remove",
        "members.changeRole",
        "audit.view",
      ];
    case "ADMIN":
      return [
        "org.read",
        "org.update",
        "members.list",
        "members.invite",
        "members.remove",
        "audit.view",
      ];
    default:
      return ["org.read", "members.list"];
  }
}

// GET → aktif org özeti
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orgId = await resolveCurrentOrgId(req);
  if (!orgId) {
    return NextResponse.json({ orgId: null, organization: null, role: null, permissions: [], memberCount: 0 });
  }

  // Org ve kullanıcının rolü
  const [org, membership, memberCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } }),
    prisma.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
      select: { role: true, status: true },
    }),
    prisma.membership.count({ where: { orgId, status: "ACTIVE" } }),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    orgId,
    organization: org,
    role: membership.role,
    permissions: permissionsFor(membership.role as UserRole),
    memberCount,
  });
}

// PATCH → aktif org'u değiştir (aynı kalsın)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = body?.orgId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "orgId_required" }, { status: 400 });

  const mem = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
    select: { status: true },
  });
  if (!mem || mem.status !== "ACTIVE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { currentOrgId: orgId },
  });

  await logAudit({
    req,
    orgId,
    actorId: session.user.id,
    action: "ORG_SWITCH",
    resource: `org:${orgId}`,
  });

  return NextResponse.json({ ok: true, orgId });
}
