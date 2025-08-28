// app/api/orgs/members/[userId]/role/route.ts - İyileştirilmiş versiyon
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId, requireRole, ensureOwnerIsNotLast } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { updateMemberRoleSchema, formatZodError } from "@/lib/validations";
import { apiRateLimit, getClientIP } from "@/lib/ratelimit";

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
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

    const { session } = await requireRole(orgId, ["OWNER"]);

    // 3. Target user mevcut mu kontrol et
    const targetMembership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: params.userId, orgId } },
      select: { 
        id: true, 
        role: true, 
        status: true,
        user: { 
          select: { email: true, name: true } 
        }
      }
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Kullanıcı bu organizasyonda bulunamadı" },
        { status: 404 }
      );
    }

    if (targetMembership.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif üyelerin rolü değiştirilebilir" },
        { status: 400 }
      );
    }

    // 4. Kendini değiştirmeye çalışıyor mu?
    if (session.user.id === params.userId) {
      return NextResponse.json(
        { error: "Kendi rolünüzü değiştiremezsiniz" },
        { status: 403 }
      );
    }

    // 5. Body parse ve validation
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
    }

    const validationResult = updateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation hatası",
          details: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const { role: newRole } = validationResult.data;

    // 6. Aynı role mu kontrol et
    if (targetMembership.role === newRole) {
      return NextResponse.json(
        { error: "Kullanıcı zaten bu role sahip" },
        { status: 400 }
      );
    }

    // 7. OWNER'ı düşürüyorsak son OWNER koruması
    if (targetMembership.role === "OWNER" && newRole !== "OWNER") {
      await ensureOwnerIsNotLast(orgId, params.userId);
    }

    // 8. Role güncelle
    const updatedMembership = await prisma.membership.update({
      where: { userId_orgId: { userId: params.userId, orgId } },
      data: { role: newRole as any },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: { email: true, name: true }
        }
      }
    });

    // 9. Audit log
    await logAudit({
      req,
      orgId,
      actorId: session.user.id,
      action: "MEMBER_ROLE_UPDATE",
      resource: `user:${params.userId}`,
      before: {
        role: targetMembership.role,
        email: targetMembership.user?.email
      },
      after: {
        role: newRole,
        email: updatedMembership.user?.email
      }
    });

    // 10. Başarılı response
    return NextResponse.json({
      success: true,
      message: "Rol güncellendi",
      member: {
        email: updatedMembership.user?.email,
        name: updatedMembership.user?.name,
        role: updatedMembership.role,
        status: updatedMembership.status
      }
    });

  } catch (error: any) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "Beklenmeyen hata oluştu" },
      { status: 500 }
    );
  }
}