// app/api/orgs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // tx tipi
import { writeAudit } from "@/lib/audit"; // ✅ audit

// Sade union tipi (enum yerine)
type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

type OrgRow = {
  role: OrgRole;
  org: { id: string; name: string };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orgs = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { role: true, org: { select: { id: true, name: true } } },
    orderBy: { orgId: "asc" },
  });

  const data = (orgs as OrgRow[]).map((m: OrgRow) => ({
    id: m.org.id,
    name: m.org.name,
    role: m.role,
  }));

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name gerekli" }, { status: 400 });
  }

  // Organizasyon + OWNER membership
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const org = await tx.organization.create({ data: { name } });
    await tx.membership.create({
      data: { userId: session.user.id, orgId: org.id, role: "OWNER" as OrgRole },
    });
    return org;
  });

  // ✅ Audit
  await writeAudit({
    req,
    actorId: session.user.id,
    action: "ORG_CREATE",
    resource: `org:${created.id}`,
    after: { id: created.id, name: created.name },
  });

  return NextResponse.json(created, { status: 201 });
}
