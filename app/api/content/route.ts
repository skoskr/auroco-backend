// app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contentSchema, formatZodError } from '@/lib/validations';

// GET - İçerikleri listeleme/getirme
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const locale = searchParams.get('locale') || 'tr';
    const isActive = searchParams.get('active') !== 'false';

    if (key) {
      // Belirli bir content'i getir
      const content = await prisma.content.findUnique({
        where: {
          key_locale: { key, locale }
        }
      });

      if (!content) {
        return NextResponse.json(
          { error: 'İçerik bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: content
      });
    }

    // Tüm içerikleri listele
    const contents = await prisma.content.findMany({
      where: {
        locale,
        isActive
      },
      orderBy: [
        { key: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: contents,
      count: contents.length
    });

  } catch (error) {
    console.error('Content GET error:', error);
    return NextResponse.json(
      { error: 'İçerikler alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni içerik oluşturma
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
    const validationResult = contentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation hatası',
          details: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const { key, title, content, locale, isActive } = validationResult.data;

    // İçerik oluştur
    const newContent = await prisma.content.create({
      data: {
        key,
        title,
        content,
        locale,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      message: 'İçerik başarıyla oluşturuldu',
      data: newContent
    }, { status: 201 });

  } catch (error) {
    console.error('Content POST error:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Bu anahtar ve dil kombinasyonu zaten mevcut' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'İçerik oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT - İçerik güncelleme
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const locale = searchParams.get('locale') || 'tr';

    if (!key) {
      return NextResponse.json(
        { error: 'İçerik anahtarı (key) gerekli' },
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

    // Partial validation (sadece gönderilen alanları kontrol et)
    const updateData: { title?: string; content?: string; isActive?: boolean } = {};
    
    if ('title' in body && typeof body.title === 'string') {
      updateData.title = body.title;
    }
    if ('content' in body && typeof body.content === 'string') {
      updateData.content = body.content;
    }
    if ('isActive' in body && typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Güncellenecek alan bulunamadı' },
        { status: 400 }
      );
    }

    // İçeriği güncelle
    const updatedContent = await prisma.content.update({
      where: {
        key_locale: { key, locale }
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'İçerik başarıyla güncellendi',
      data: updatedContent
    });

  } catch (error) {
    console.error('Content PUT error:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Güncellenecek içerik bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'İçerik güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - İçerik silme
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const locale = searchParams.get('locale') || 'tr';

    if (!key) {
      return NextResponse.json(
        { error: 'İçerik anahtarı (key) gerekli' },
        { status: 400 }
      );
    }

    // İçeriği sil
    await prisma.content.delete({
      where: {
        key_locale: { key, locale }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'İçerik başarıyla silindi'
    });

  } catch (error) {
    console.error('Content DELETE error:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Silinecek içerik bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'İçerik silinirken hata oluştu' },
      { status: 500 }
    );
  }
}