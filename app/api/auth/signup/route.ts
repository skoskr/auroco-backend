// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client"; // 👈 TIP İÇİN EKLENDİ

export async function POST(req: Request) {
  try {
    const { email, password, name, orgName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "email & password gerekli" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "email kullanımda" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 👇 tx tipini Prisma.TransactionClient 
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: { email, name: name ?? null, passwordHash },
      });

      const org = await tx.organization.create({
        data: { name: orgName ?? `${(name ?? email)}'s Org` },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'OWNER', 
        },
      });

      return { user, org };
    });

    return NextResponse.json({ ok: true, userId: result.user.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "beklenmeyen hata" }, { status: 500 });
  }
}
