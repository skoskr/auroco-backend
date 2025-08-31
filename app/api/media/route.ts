// app/api/media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile, deleteFile, getFileCategory, formatFileSize } from '@/lib/upload';

// GET - Medya dosyalarını listeleme
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: { category?: string } = {};
    if (category) where.category = category;

    const [mediaFiles, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.media.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: mediaFiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Media GET error:', error);
    return NextResponse.json(
      { error: 'Medya dosyaları alınırken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Dosya yükleme
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string || '';
    const category = formData.get('category') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    // File data hazırla
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileData = {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer
    };

    // Dosyayı yükle
    const uploadResult = await uploadFile(fileData, category || getFileCategory(file.type));
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Database'e kaydet
    const mediaRecord = await prisma.media.create({
      data: {
        filename: uploadResult.filename!,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: uploadResult.url!,
        alt: alt || null,
        category: category || getFileCategory(file.type)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Dosya başarıyla yüklendi',
      data: {
        ...mediaRecord,
        formattedSize: formatFileSize(mediaRecord.size)
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Media POST error:', error);
    return NextResponse.json(
      { error: 'Dosya yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Dosya silme
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Dosya ID gerekli' },
        { status: 400 }
      );
    }

    // Database'den media kaydını al
    const mediaRecord = await prisma.media.findUnique({
      where: { id }
    });

    if (!mediaRecord) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 404 }
      );
    }

    // Fiziksel dosyayı sil
    const fileDeleted = await deleteFile(mediaRecord.filename, mediaRecord.mimeType);
    
    if (!fileDeleted) {
      console.warn(`Physical file not found: ${mediaRecord.filename}`);
    }

    // Database kaydını sil
    await prisma.media.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Dosya başarıyla silindi'
    });

  } catch (error) {
    console.error('Media DELETE error:', error);
    return NextResponse.json(
      { error: 'Dosya silinirken hata oluştu' },
      { status: 500 }
    );
  }
}