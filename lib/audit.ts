// lib/audit.ts
import { prisma } from "@/lib/prisma";
import { resolveCurrentOrgId } from "@/lib/authz";

export type AuditInput = {
  orgId: string;                 // yeni şemada zorunlu
  req?: Request;                 // ip/ua için opsiyonel
  actorId?: string | null;
  action: string;
  resource?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  ua?: string | null;
};

export async function logAudit(input: AuditInput) {
  const ip = input.ip ?? input.req?.headers.get("x-forwarded-for") ?? null;
  const ua = input.ua ?? input.req?.headers.get("user-agent") ?? null;

  return prisma.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId ?? null,
      action: input.action,
      resource: input.resource ?? null,
      before: (input.before as any) ?? undefined,
      after: (input.after as any) ?? undefined,
      ip,
      ua,
    },
  });
}

// Geçiş dönemi uyumluluk katmanı
export async function writeAudit(args: any) {
  // Eski çağrılar orgId göndermiyorsa, orgId'yi anlamaya çalış:
  if (!args?.orgId) {
    const maybe = args?.req ? await resolveCurrentOrgId(args.req) : null;
    if (maybe) {
      args.orgId = maybe;
    } else {
      throw new Error(
        "writeAudit → orgId zorunlu (schema değişti). Lütfen logAudit({ orgId, ... }) kullan."
      );
    }
  }
  return logAudit(args as AuditInput);
}
