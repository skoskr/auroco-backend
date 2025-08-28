// app/api/orgs/members/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole, ensureOwnerIsNotLast } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  const orgId = await resolveCurrentOrgId(req);
  if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

  const { session } = await requireRole(orgId, ["OWNER", "ADMIN"]);

  // OWNER'ı siliyorsak son OWNER koruması
  await ensureOwnerIsNotLast(orgId, params.userId);

  const before = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: params.userId, orgId } },
  });

  const deleted = await prisma.membership.delete({
    where: { userId_orgId: { userId: params.userId, orgId } },
  });

  await logAudit({
    orgId,
    actorId: session.user.id,
    action: "MEMBERS_DELETE",
    resource: `user:${params.userId}`,
    before,
    after: deleted,
  });

  return NextResponse.json({ ok: true });
}
