// app/api/orgs/members/invite/route.ts - İyileştirilmiş versiyon
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { inviteMemberSchema, formatZodError } from "@/lib/validations";
import { apiRateLimit, getClientIP } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    // 1. Rate limiting
    const clientIP = getClientIP(req);
    const { success } = await apiRateLimit.limit(clientIP);
    if (!success) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen bekleyin." },
        { status: 429 }
      );
    }

    // 2. Organization ve permission kontrolü
    const orgId = await resolveCurrentOrgId(req);
    if (!orgId) {
      return NextResponse.json({ error: "Organizasyon gerekli" }, { status: 400 });
    }

    const { session } = await requireRole(orgId, ["OWNER", "ADMIN"]);

    // 3. Body parse ve validation
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
    }

    const validationResult = inviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation hatası",
          details: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;

    // 4. Mevcut membership kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true,
        memberships: {
          where: { orgId },
          select: { status: true, role: true }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      const membership = existingUser.memberships[0];
      if (membership.status === "ACTIVE") {
        return NextResponse.json(
          { error: "Kullanıcı zaten organizasyonda aktif" },
          { status: 409 }
        );
      }
      if (membership.status === "PENDING") {
        return NextResponse.json(
          { error: "Bu kullanıcıya zaten davet gönderildi" },
          { status: 409 }
        );
      }
    }

    // 5. User oluştur/güncelle ve membership ekle
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true, email: true }
      });

      const membership = await tx.membership.upsert({
        where: { userId_orgId: { userId: user.id, orgId } },
        update: { status: "PENDING", role: role as any },
        create: { 
          userId: user.id, 
          orgId, 
          role: role as any, 
          status: "PENDING" 
        },
        select: {
          id: true,
          role: true,
          status: true,
          user: {
            select: { email: true, name: true }
          }
        }
      });

      return { user, membership };
    });

    // 6. Audit log
    await logAudit({
      req,
      orgId,
      actorId: session.user.id,
      action: "MEMBER_INVITE",
      resource: `user:${result.user.id}`,
      after: {
        email: result.user.email,
        role: role as any,
        status: "PENDING"
      }
    });

    // 7. Başarılı response
    return NextResponse.json({
      success: true,
      message: "Davet gönderildi",
      invite: {
        email: result.user.email,
        role: result.membership.role,
        status: result.membership.status
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("Member invite error:", error);
    return NextResponse.json(
      { error: "Beklenmeyen hata oluştu" },
      { status: 500 }
    );
  }
}