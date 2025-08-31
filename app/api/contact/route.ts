// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactFormSchema, formatZodError } from '@/lib/validations';
import { sendContactFormNotification, sendAutoReply } from '@/lib/email';

// GET - İletişim formlarını listeleme (admin için)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: { status?: string } = {};
    if (status) where.status = status;

    const [contacts, total] = await Promise.all([
      prisma.contactForm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.contactForm.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Contact GET error:', error);
    return NextResponse.json(
      { error: 'İletişim formları alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni iletişim formu gönderme
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz JSON formatı' },
        { status: 400 }
      );
    }

    // Validation
    const validationResult = contactFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation hatası',
          details: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const contactData = validationResult.data;

    // Database'e kaydet
    const contact = await prisma.contactForm.create({
      data: {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || null,
        company: contactData.company || null,
        service: contactData.service,
        subService: contactData.subService || null,
        message: contactData.message,
        status: 'NEW'
      }
    });

    // Email gönderme işlemleri (async olarak)
    Promise.all([
      // Admin'e bildirim gönder
      sendContactFormNotification(contactData).catch(error => {
        console.error('Admin email error:', error);
        // Log the error but don't fail the request
        prisma.systemLog.create({
          data: {
            level: 'ERROR',
            message: 'Admin email gönderilemedi',
            data: { 
              error: error.message, 
              contactId: contact.id,
              adminEmail: process.env.ADMIN_EMAIL 
            }
          }
        }).catch(logError => {
          console.error('Log kayıt hatası:', logError);
        });
      }),

      // Müşteriye otomatik yanıt gönder
      sendAutoReply(contactData.email, contactData.name).catch(error => {
        console.error('Auto reply error:', error);
        // Log the error but don't fail the request
        prisma.systemLog.create({
          data: {
            level: 'ERROR',
            message: 'Otomatik yanıt gönderilemedi',
            data: { 
              error: error.message, 
              contactId: contact.id,
              customerEmail: contactData.email 
            }
          }
        }).catch(logError => {
          console.error('Log kayıt hatası:', logError);
        });
      })
    ]).catch(error => {
      console.error('Email processing error:', error);
    });

    // Success log
    prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'Yeni iletişim formu alındı',
        data: {
          contactId: contact.id,
          service: contactData.service,
          name: contactData.name,
          email: contactData.email
        },
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    }).catch(logError => {
      console.error('Success log kayıt hatası:', logError);
    });

    return NextResponse.json({
      success: true,
      message: 'İletişim formunuz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      data: {
        id: contact.id,
        status: contact.status,
        createdAt: contact.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Contact POST error:', error);

    // Error log
    prisma.systemLog.create({
      data: {
        level: 'ERROR',
        message: 'İletişim formu kaydetme hatası',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    }).catch(logError => {
      console.error('Error log kayıt hatası:', logError);
    });

    return NextResponse.json(
      { error: 'İletişim formunuz gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.' },
      { status: 500 }
    );
  }
}

// PUT - İletişim formu status güncelleme (admin için)
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'İletişim formu ID gerekli' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz JSON formatı' },
        { status: 400 }
      );
    }

    const { status } = body;

    if (!status || !['NEW', 'REVIEWED', 'RESPONDED', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Geçerli status değeri gerekli (NEW, REVIEWED, RESPONDED, CLOSED)' },
        { status: 400 }
      );
    }

    const updatedContact = await prisma.contactForm.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'İletişim formu durumu güncellendi',
      data: updatedContact
    });

  } catch (error) {
    console.error('Contact PUT error:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'İletişim formu bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'İletişim formu güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - İletişim formu silme (admin için)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'İletişim formu ID gerekli' },
        { status: 400 }
      );
    }

    await prisma.contactForm.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'İletişim formu başarıyla silindi'
    });

  } catch (error) {
    console.error('Contact DELETE error:', error);

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'İletişim formu bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'İletişim formu silinirken hata oluştu' },
      { status: 500 }
    );
  }
}