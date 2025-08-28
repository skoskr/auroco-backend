export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/ratelimit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

// GET → kullanıcıları listele (rate-limit korumalı)
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit aşıldı. Daha sonra tekrar dene." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// POST → yeni kullanıcı oluştur (+ audit)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email zorunlu" }, { status: 400 });
    }

    const created = await prisma.user.create({
      data: { email, name },
    });

    // audit
    const session = await getServerSession(authOptions);
    await writeAudit({
      req,
      actorId: session?.user?.id ?? null,
      action: "USER_CREATE",
      resource: `user:${created.id}`,
      after: { id: created.id, email: created.email, name: created.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "beklenmeyen hata" },
      { status: 500 }
    );
  }
}
