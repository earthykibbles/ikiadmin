import { cache, createCacheKey } from '@/lib/cache';
import { providersSql } from '@/lib/providersDb';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';
import type { ProviderDto, ProviderRow } from '../route';

type ProviderCoordinates = { lat: number; lng: number };

type PatchBody = Partial<ProviderDto> & {
  providerName?: string;
  inferredCategories?: string[];
  emails?: string[];
  telephone?: string[];
  services?: string[];
  coordinates?: ProviderCoordinates | null;
};

function parseId(raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseJsonStringArray(raw: unknown): string[] {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s || s === '[]' || s.toLowerCase() === 'null') return [];
  try {
    const v = JSON.parse(s);
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    return [];
  } catch {
    return s ? [s] : [];
  }
}

function parseCoordinates(raw: unknown): ProviderCoordinates | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  try {
    const v = JSON.parse(s);
    const lat = (v as any)?.lat;
    const lng = (v as any)?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
    return null;
  } catch {
    return null;
  }
}

function toProviderDto(row: ProviderRow): ProviderDto {
  return {
    id: Number(row.id),
    providerName: row.provider_name ?? '',
    location: row.location,
    physicalAddress: row.physical_address,
    telephone: parseJsonStringArray(row.telephone),
    services: parseJsonStringArray(row.services),
    emails: parseJsonStringArray(row.email),
    speciality: row.speciality,
    inferredCategories: parseJsonStringArray(row.inferred_categories),
    coordinates: parseCoordinates(row.coordinates),
    formattedAddress: row.formatted_address,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PROVIDER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (invalidated on writes)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

    const cacheKey = createCacheKey('provider', { id });
    const cached = cache.get<{ provider: ProviderDto }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rows = (await providersSql.unsafe(
      `
      SELECT
        id, provider_name, location, physical_address, telephone, services,
        email, speciality, inferred_categories, coordinates, formatted_address,
        country, created_at, updated_at
      FROM providers
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    )) as unknown as ProviderRow[];

    if (!rows.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const response = { provider: toProviderDto(rows[0]!) };
    cache.set(cacheKey, response, PROVIDER_CACHE_TTL_MS);
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

    const body = (await req.json()) as PatchBody;

    const sets: string[] = [];
    const values: any[] = [];

    const push = (col: string, value: any) => {
      sets.push(`${col} = $${values.length + 1}`);
      values.push(value);
    };

    if (body.providerName !== undefined) push('provider_name', String(body.providerName).trim());
    if (body.location !== undefined) push('location', body.location ?? null);
    if (body.physicalAddress !== undefined) push('physical_address', body.physicalAddress ?? null);
    if (body.speciality !== undefined) push('speciality', body.speciality ?? null);
    if (body.formattedAddress !== undefined) push('formatted_address', body.formattedAddress ?? null);
    if (body.country !== undefined) push('country', body.country ?? null);

    if (body.telephone !== undefined) push('telephone', JSON.stringify(body.telephone ?? []));
    if (body.services !== undefined) push('services', JSON.stringify(body.services ?? []));
    if (body.emails !== undefined) push('email', JSON.stringify(body.emails ?? []));
    if (body.inferredCategories !== undefined)
      push('inferred_categories', JSON.stringify(body.inferredCategories ?? []));

    if (body.coordinates !== undefined) {
      push('coordinates', body.coordinates ? JSON.stringify(body.coordinates) : null);
    }

    if (!sets.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // updated_at trigger exists, but we set it explicitly too.
    sets.push(`updated_at = NOW()`);

    const rows = (await providersSql.unsafe(
      `
      UPDATE providers
      SET ${sets.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING
        id, provider_name, location, physical_address, telephone, services,
        email, speciality, inferred_categories, coordinates, formatted_address,
        country, created_at, updated_at
      `,
      [...values, id],
    )) as unknown as ProviderRow[];

    if (!rows.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Invalidate caches so edits show up immediately.
    cache.deleteByPrefix('provider');
    cache.deleteByPrefix('providers');

    return NextResponse.json({ provider: toProviderDto(rows[0]!) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'delete');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

    const rows = (await providersSql.unsafe('DELETE FROM providers WHERE id = $1 RETURNING id', [
      id,
    ])) as unknown as Array<{ id: number }>;

    if (!rows.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Invalidate caches so deletes show up immediately.
    cache.deleteByPrefix('provider');
    cache.deleteByPrefix('providers');

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



