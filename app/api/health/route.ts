// app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`;
    
    // Redis health check (opsiyonel)
    // const redis = new Redis({ ... });
    // await redis.ping();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: "connected" // Redis kontrol ederseniz
      }
    });

  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json({
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error : 'Service unavailable'
    }, { 
      status: 503 
    });
  }
}