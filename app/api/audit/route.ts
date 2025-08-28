// app/api/audit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

  const orgId = await resolveCurrentOrgId(req);
  if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

  await requireRole(orgId, ["OWNER", "ADMIN"]);

  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, orgId: true, actorId: true, action: true, resource: true, createdAt: true },
  });

  return NextResponse.json(logs);
}
