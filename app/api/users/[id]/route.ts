// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireSelfOrRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type Params = { params: { id: string } };

// GET → tek kullanıcı (org-scope gerektirmeyebilir; ancak bildirimli bırakıyorum)
export async function GET(_req: Request, { params }: Params) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH → güncelle (+ guard + audit: before/after)
export async function PATCH(req: Request, { params }: Params) {
  try {
    const orgId = await resolveCurrentOrgId(req);
    if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

    const { session } = await requireSelfOrRole(orgId, params.id, ["ADMIN", "OWNER"]);

    const before = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true },
    });
    if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const data: { email?: string; name?: string | null } = {};

    if ("email" in body) {
      if (typeof body.email !== "string")
        return NextResponse.json({ error: "email must be string" }, { status: 400 });
      data.email = body.email;
    }
    if ("name" in body) {
      if (body.name !== null && typeof body.name !== "string")
        return NextResponse.json({ error: "name must be string or null" }, { status: 400 });
      data.name = body.name ?? null;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true },
    });

    await logAudit({
      req,
      orgId,
      actorId: session.user.id,
      action: "USER_UPDATE",
      resource: `user:${params.id}`,
      before,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unexpected_error" },
      { status: 500 }
    );
  }
}

// DELETE → sil (+ guard + audit: before)
export async function DELETE(req: Request, { params }: Params) {
  try {
    const orgId = await resolveCurrentOrgId(req);
    if (!orgId) return NextResponse.json({ error: "org_required" }, { status: 400 });

    const { session } = await requireSelfOrRole(orgId, params.id, ["ADMIN", "OWNER"]);

    const before = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true },
    });
    if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.user.delete({ where: { id: params.id } });

    await logAudit({
      req,
      orgId,
      actorId: session.user.id,
      action: "USER_DELETE",
      resource: `user:${params.id}`,
      before,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unexpected_error" },
      { status: 500 }
    );
  }
}
