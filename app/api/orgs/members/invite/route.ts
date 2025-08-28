// app/api/orgs/members/invite/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const orgId = await resolveCurrentOrgId(req);
  if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

  const { session } = await requireRole(orgId, ["OWNER", "ADMIN"]);

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
    select: { id: true },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId } },
    update: { status: "PENDING" },
    create: { userId: user.id, orgId, role: "MEMBER", status: "PENDING" },
  });

  await logAudit({
    orgId,
    actorId: session.user.id,
    action: "MEMBERS_INVITE",
    resource: `user:${user.id}`,
  });

  return NextResponse.json({ ok: true });
}
