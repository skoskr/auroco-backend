// app/api/orgs/members/[userId]/role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole, ensureOwnerIsNotLast } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const orgId = await resolveCurrentOrgId(req);
  if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

  const { session } = await requireRole(orgId, ["OWNER"]);

  const { role } = await req.json(); // "ADMIN" | "MEMBER" | "OWNER"
  if (!["OWNER", "ADMIN", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  // OWNER'ı düşürüyorsak son OWNER koruması
  if (role !== "OWNER") {
    await ensureOwnerIsNotLast(orgId, params.userId);
  }

  const before = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: params.userId, orgId } },
  });

  const updated = await prisma.membership.update({
    where: { userId_orgId: { userId: params.userId, orgId } },
    data: { role },
  });

  await logAudit({
    orgId,
    actorId: session.user.id,
    action: "MEMBERS_ROLE_CHANGE",
    resource: `user:${params.userId}`,
    before,
    after: updated,
  });

  return NextResponse.json({ ok: true });
}
