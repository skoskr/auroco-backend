// app/api/auth/signup/route.ts - İyileştirilmiş versiyon
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authRateLimit, getClientIP } from "@/lib/ratelimit";
import { signupSchema, formatZodError } from "@/lib/validations";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    // 1. Rate limiting kontrolü
    const clientIP = getClientIP(req);
    const { success, remaining } = await authRateLimit.limit(clientIP);
    
    if (!success) {
      return NextResponse.json(
        { error: "Çok fazla deneme yapıldı. Lütfen 1 dakika sonra tekrar deneyin." },
        { 
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() }
        }
      );
    }

    // 2. Request body'yi parse et
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Geçersiz JSON formatı" },
        { status: 400 }
      );
    }

    // 3. Zod validation
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation hatası",
          details: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const { email, password, name, orgName } = validationResult.data;

    // 4. Email unique kontrolü
    const existingUser = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true } // Sadece gerekli field'ı seç
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanımda" },
        { status: 409 }
      );
    }

    // 5. Password hash
    const passwordHash = await bcrypt.hash(password, 12); // 12 rounds daha güvenli

    // 6. Transaction ile user + org + membership oluştur
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // User oluştur
      const user = await tx.user.create({
        data: { 
          email, 
          name: name || null, 
          passwordHash 
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });

      // Organization oluştur
      const org = await tx.organization.create({
        data: { 
          name: orgName || `${name || email.split('@')[0]}'s Organization`
        },
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      });

      // Membership oluştur
      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });

      // User'ın currentOrgId'sini set et
      await tx.user.update({
        where: { id: user.id },
        data: { currentOrgId: org.id }
      });

      return { user, org };
    });

    // 7. Başarılı response
    return NextResponse.json({
      success: true,
      message: "Kayıt başarılı",
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
      },
      organization: {
        id: result.org.id,
        name: result.org.name
      }
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Remaining': remaining.toString()
      }
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    
    // Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "Bu email adresi zaten kullanımda" },
          { status: 409 }
        );
      }
    }

    // Genel hata
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}