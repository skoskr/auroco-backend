// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Admin dashboard istatistikleri
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return await getStats();
      
      case 'recent-contacts':
        const limit = parseInt(searchParams.get('limit') || '5');
        return await getRecentContacts(limit);
      
      case 'system-logs':
        const logLimit = parseInt(searchParams.get('limit') || '10');
        const level = searchParams.get('level');
        return await getSystemLogs(logLimit, level);
      
      default:
        return await getDashboardOverview();
    }

  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json(
      { error: 'Admin verileri alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// Dashboard genel bakış
async function getDashboardOverview() {
  const [
    totalContacts,
    newContacts,
    totalContents,
    totalMedia,
    serviceStats
  ] = await Promise.all([
    // Toplam iletişim formları
    prisma.contactForm.count(),
    
    // Son 24 saatteki yeni formlar
    prisma.contactForm.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Toplam içerik sayısı
    prisma.content.count({
      where: { isActive: true }
    }),
    
    // Toplam medya dosyası sayısı
    prisma.media.count(),
    
    // Hizmet bazlı istatistikler
    prisma.contactForm.groupBy({
      by: ['service'],
      _count: { service: true },
      orderBy: { _count: { service: 'desc' } }
    })
  ]);

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalContacts,
        newContacts,
        totalContents,
        totalMedia
      },
      serviceStats: serviceStats.map(stat => ({
        service: stat.service,
        count: stat._count.service
      }))
    }
  });
}

// İstatistikler
async function getStats() {
  const [
    statusStats,
    monthlyContacts,
    topServices
  ] = await Promise.all([
    // Status bazlı istatistikler
    prisma.contactForm.groupBy({
      by: ['status'],
      _count: { status: true }
    }),
    
    // Son 12 ayın verileri
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM "ContactForm" 
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `,
    
    // En popüler hizmetler
    prisma.contactForm.groupBy({
      by: ['service'],
      _count: { service: true },
      orderBy: { _count: { service: 'desc' } },
      take: 5
    })
  ]);

  return NextResponse.json({
    success: true,
    data: {
      statusStats: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.status
      })),
      monthlyContacts,
      topServices: topServices.map(service => ({
        service: service.service,
        count: service._count.service
      }))
    }
  });
}

// Son iletişim formları
async function getRecentContacts(limit: number) {
  const contacts = await prisma.contactForm.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      service: true,
      status: true,
      createdAt: true
    }
  });

  return NextResponse.json({
    success: true,
    data: contacts
  });
}

// Sistem logları
async function getSystemLogs(limit: number, level?: string | null) {
  const where: { level?: string } = {};
  if (level) where.level = level;

  const logs = await prisma.systemLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return NextResponse.json({
    success: true,
    data: logs
  });
}

// POST - Sistem logu ekleme
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level, message, data } = body;

    if (!level || !message) {
      return NextResponse.json(
        { error: 'Level ve message alanları gerekli' },
        { status: 400 }
      );
    }

    // Client IP ve User Agent bilgilerini al
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const log = await prisma.systemLog.create({
      data: {
        level,
        message,
        data: data || null,
        ip,
        userAgent
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Log kaydedildi',
      data: log
    }, { status: 201 });

  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json(
      { error: 'Log kaydedilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT - Contact form status güncelleme
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID gerekli' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!['NEW', 'REVIEWED', 'RESPONDED', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Geçersiz status değeri' },
        { status: 400 }
      );
    }

    const updatedContact = await prisma.contactForm.update({
      where: { id: contactId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Status güncellendi',
      data: updatedContact
    });

  } catch (error) {
    console.error('Admin PUT error:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'İletişim formu bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Status güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}