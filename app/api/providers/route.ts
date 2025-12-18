import { cache, createCacheKey } from '@/lib/cache';
import { providersSql } from '@/lib/providersDb';
import { RESOURCE_TYPES, requirePermission } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

type ProviderCoordinates = { lat: number; lng: number };

export type ProviderRow = {
  id: number;
  provider_name: string;
  location: string | null;
  physical_address: string | null;
  telephone: string | null;
  services: string | null;
  email: string | null;
  speciality: string | null;
  inferred_categories: string | null;
  coordinates: string | null;
  formatted_address: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProviderDto = {
  id: number;
  providerName: string;
  location: string | null;
  physicalAddress: string | null;
  telephone: string[];
  services: string[];
  emails: string[];
  speciality: string | null;
  inferredCategories: string[];
  coordinates: ProviderCoordinates | null;
  formattedAddress: string | null;
  country: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

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

function categoryToSearchTerm(category: string) {
  if (category.toLowerCase() === 'specialists') {
    // Match both "Specialist" and "Specialists" (and other variants)
    return '%Specialist%';
  }
  return `%${category}%`;
}

const PROVIDERS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (invalidated on writes)

export async function GET(req: NextRequest) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'read');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get('q') ?? '').trim();
    const category = (searchParams.get('category') ?? '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50) || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0) || 0, 0);

    const cacheKey = createCacheKey('providers', {
      q: q ? q.toLowerCase() : '',
      category: category ? category.toLowerCase() : '',
      limit,
      offset,
    });
    const cached = cache.get<{ providers: ProviderDto[]; limit: number; offset: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereParts: string[] = [];
    const params: any[] = [];

    if (category) {
      whereParts.push(`inferred_categories::text ILIKE $${params.length + 1}`);
      params.push(categoryToSearchTerm(category));
    }

    if (q) {
      const term = `%${q}%`;
      whereParts.push(
        `(
          provider_name ILIKE $${params.length + 1}
          OR speciality ILIKE $${params.length + 1}
          OR services::text ILIKE $${params.length + 1}
          OR inferred_categories::text ILIKE $${params.length + 1}
          OR location ILIKE $${params.length + 1}
          OR country ILIKE $${params.length + 1}
        )`,
      );
      params.push(term);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const rows = (await providersSql.unsafe(
      `
      SELECT
        id, provider_name, location, physical_address, telephone, services,
        email, speciality, inferred_categories, coordinates, formatted_address,
        country, created_at, updated_at
      FROM providers
      ${whereSql}
      ORDER BY provider_name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    )) as unknown as ProviderRow[];

    const providers = rows.map(toProviderDto);
    const response = { providers, limit, offset };
    cache.set(cacheKey, response, PROVIDERS_CACHE_TTL_MS);
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requirePermission(req, RESOURCE_TYPES.PROVIDERS, 'write');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = (await req.json()) as Partial<ProviderDto> & {
      providerName?: string;
      inferredCategories?: string[];
      emails?: string[];
      telephone?: string[];
      services?: string[];
      coordinates?: ProviderCoordinates | null;
    };

    const providerName = (body.providerName ?? '').trim();
    if (!providerName) {
      return NextResponse.json({ error: 'providerName is required' }, { status: 400 });
    }

    // If id not provided, pick next integer id.
    const id =
      typeof body.id === 'number'
        ? body.id
        : Number(
            (await providersSql.unsafe(
              'SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM providers',
            ))?.[0]?.next_id,
          );

    const telephone = JSON.stringify(body.telephone ?? []);
    const services = JSON.stringify(body.services ?? []);
    const emails = JSON.stringify(body.emails ?? []);
    const inferred = JSON.stringify(body.inferredCategories ?? []);
    const coords = body.coordinates ? JSON.stringify(body.coordinates) : null;

    const inserted = (await providersSql.unsafe(
      `
      INSERT INTO providers (
        id, provider_name, location, physical_address, telephone, services,
        email, speciality, inferred_categories, coordinates, formatted_address,
        country, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, NOW(), NOW()
      )
      RETURNING
        id, provider_name, location, physical_address, telephone, services,
        email, speciality, inferred_categories, coordinates, formatted_address,
        country, created_at, updated_at
      `,
      [
        id,
        providerName,
        body.location ?? null,
        body.physicalAddress ?? null,
        telephone,
        services,
        emails,
        body.speciality ?? null,
        inferred,
        coords,
        body.formattedAddress ?? null,
        body.country ?? null,
      ],
    )) as unknown as ProviderRow[];

    // Invalidate list caches so the new provider appears immediately.
    cache.deleteByPrefix('providers');

    return NextResponse.json({ provider: toProviderDto(inserted[0]!) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



