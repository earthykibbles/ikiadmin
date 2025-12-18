'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';

type ProviderCoordinates = { lat: number; lng: number };

type Provider = {
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

type Review = {
  id: string;
  userId: string | null;
  userName: string;
  providerId: number;
  providerName: string | null;
  rating: number | null;
  comment: string;
  appointmentId: string | null;
  createdAt: string | null;
};

type ProvidersResponse = {
  providers: Provider[];
  limit: number;
  offset: number;
};

// Client-side session cache to avoid repeated list fetches while navigating around iki-gen.
// This is cleared on manual refresh and after writes.
const providersListCache: {
  data: Map<string, ProvidersResponse>;
  inFlight: Map<string, Promise<ProvidersResponse>>;
} = {
  data: new Map(),
  inFlight: new Map(),
};

function providersListCacheKey(params: URLSearchParams) {
  // Normalize key ordering for stable cache keys.
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  return `providers?${entries.map(([k, v]) => `${k}=${v}`).join('&')}`;
}

const CATEGORY_TABS = ['Outpatient', 'Inpatient', 'Specialists', 'Counsellors'] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number] | 'All';

type ModalMode = 'create' | 'edit' | 'view';

type ProviderFormState = {
  id?: number;
  providerName: string;
  location: string;
  physicalAddress: string;
  telephoneCsv: string;
  servicesCsv: string;
  emailsCsv: string;
  speciality: string;
  inferredCategoriesCsv: string;
  lat: string;
  lng: string;
  formattedAddress: string;
  country: string;
};

function toCsv(values: string[]) {
  return values.join(', ');
}

function parseCsv(value: string): string[] {
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // de-dupe while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const key = i.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

function providerToForm(p: Provider, defaultCategory?: string): ProviderFormState {
  const inferred = p.inferredCategories.length
    ? p.inferredCategories
    : defaultCategory
      ? [defaultCategory]
      : [];

  return {
    id: p.id,
    providerName: p.providerName ?? '',
    location: p.location ?? '',
    physicalAddress: p.physicalAddress ?? '',
    telephoneCsv: toCsv(p.telephone ?? []),
    servicesCsv: toCsv(p.services ?? []),
    emailsCsv: toCsv(p.emails ?? []),
    speciality: p.speciality ?? '',
    inferredCategoriesCsv: toCsv(inferred),
    lat: p.coordinates?.lat != null ? String(p.coordinates.lat) : '',
    lng: p.coordinates?.lng != null ? String(p.coordinates.lng) : '',
    formattedAddress: p.formattedAddress ?? '',
    country: p.country ?? '',
  };
}

function emptyForm(defaultCategory?: string): ProviderFormState {
  return {
    providerName: '',
    location: '',
    physicalAddress: '',
    telephoneCsv: '',
    servicesCsv: '',
    emailsCsv: '',
    speciality: '',
    inferredCategoriesCsv: defaultCategory ? defaultCategory : '',
    lat: '',
    lng: '',
    formattedAddress: '',
    country: '',
  };
}

function toPayload(form: ProviderFormState) {
  const lat = form.lat.trim() ? Number(form.lat) : null;
  const lng = form.lng.trim() ? Number(form.lng) : null;

  const coords =
    typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
      ? { lat, lng }
      : null;

  const payload = {
    ...(form.id != null ? { id: form.id } : {}),
    providerName: form.providerName.trim(),
    location: form.location.trim() || null,
    physicalAddress: form.physicalAddress.trim() || null,
    telephone: parseCsv(form.telephoneCsv),
    services: parseCsv(form.servicesCsv),
    emails: parseCsv(form.emailsCsv),
    speciality: form.speciality.trim() || null,
    inferredCategories: parseCsv(form.inferredCategoriesCsv),
    coordinates: coords,
    formattedAddress: form.formattedAddress.trim() || null,
    country: form.country.trim() || null,
  };

  return payload;
}

function mapEmbedUrl(coords: ProviderCoordinates) {
  const { lat, lng } = coords;
  // Works without an API key.
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=14&output=embed`;
}

function mapsLink(coords: ProviderCoordinates) {
  const { lat, lng } = coords;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

function formatStars(rating: number | null) {
  const r = Math.max(0, Math.min(5, Number(rating ?? 0)));
  const full = '★'.repeat(Math.round(r));
  const empty = '☆'.repeat(5 - Math.round(r));
  return `${full}${empty}`;
}

export default function ProvidersManagement() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('Outpatient');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selected, setSelected] = useState<Provider | null>(null);
  const [form, setForm] = useState<ProviderFormState>(() => emptyForm('Outpatient'));
  const [saving, setSaving] = useState(false);

  const [detailTab, setDetailTab] = useState<'details' | 'reviews' | 'map'>('details');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ totalReviews: number; averageRating: number } | null>(
    null,
  );

  const categoryParam = useMemo(() => {
    return activeTab === 'All' ? '' : activeTab;
  }, [activeTab]);

  const fetchProviders = async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoryParam) params.set('category', categoryParam);
      params.set('limit', '200');
      params.set('offset', '0');

      const key = providersListCacheKey(params);

      if (forceRefresh) {
        providersListCache.data.delete(key);
        providersListCache.inFlight.delete(key);
      } else {
        const cached = providersListCache.data.get(key);
        if (cached) {
          setProviders(cached.providers ?? []);
          return;
        }
        const inFlight = providersListCache.inFlight.get(key);
        if (inFlight) {
          const cachedResponse = await inFlight;
          setProviders(cachedResponse.providers ?? []);
          return;
        }
      }

      const fetchPromise = fetch(`/api/providers?${params.toString()}`)
        .then(async (res) => {
          const data = (await res.json()) as ProvidersResponse & { error?: string };
          if (!res.ok) throw new Error(data?.error || 'Failed to fetch providers');
          return { providers: data.providers ?? [], limit: data.limit ?? 200, offset: data.offset ?? 0 };
        })
        .then((response) => {
          providersListCache.data.set(key, response);
          return response;
        })
        .finally(() => {
          providersListCache.inFlight.delete(key);
        });

      providersListCache.inFlight.set(key, fetchPromise);
      const response = await fetchPromise;

      setProviders(response.providers ?? []);
    } catch (e) {
      setProviders([]);
      setError(e instanceof Error ? e.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  const openCreate = () => {
    const defaultCategory = activeTab === 'All' ? undefined : activeTab;
    setModalMode('create');
    setSelected(null);
    setDetailTab('details');
    setReviews([]);
    setReviewStats(null);
    setReviewsError(null);
    setForm(emptyForm(defaultCategory));
    setModalOpen(true);
  };

  const openView = (p: Provider) => {
    setModalMode('view');
    setSelected(p);
    setDetailTab('details');
    setReviews([]);
    setReviewStats(null);
    setReviewsError(null);
    setForm(providerToForm(p, activeTab === 'All' ? undefined : activeTab));
    setModalOpen(true);
  };

  const openEdit = (p: Provider) => {
    setModalMode('edit');
    setSelected(p);
    setDetailTab('details');
    setReviews([]);
    setReviewStats(null);
    setReviewsError(null);
    setForm(providerToForm(p, activeTab === 'All' ? undefined : activeTab));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = toPayload(form);

      if (!payload.providerName) {
        throw new Error('Provider name is required');
      }

      let res: Response;
      if (modalMode === 'create') {
        res = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/providers/${selected?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');

      const updated: Provider = data.provider;
      setSelected(updated);
      setModalMode('view');
      setForm(providerToForm(updated));

      providersListCache.data.clear();
      providersListCache.inFlight.clear();
      await fetchProviders({ forceRefresh: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Provider) => {
    const ok = confirm(`Delete "${p.providerName}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/providers/${p.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');

      setModalOpen(false);
      setSelected(null);
      providersListCache.data.clear();
      providersListCache.inFlight.clear();
      await fetchProviders({ forceRefresh: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const loadReviews = async (providerId: number) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const res = await fetch(`/api/providers/${providerId}/reviews?limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch reviews');

      setReviews(data.reviews ?? []);
      setReviewStats(data.stats ?? null);
    } catch (e) {
      setReviews([]);
      setReviewStats(null);
      setReviewsError(e instanceof Error ? e.message : 'Failed to fetch reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    if (detailTab !== 'reviews') return;
    if (!selected?.id) return;

    loadReviews(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, detailTab, selected?.id]);

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h2 className="section-title">Providers</h2>
        <p className="section-subtitle">
          Manage Outpatient, Inpatient, Specialists, and Counsellors (Postgres + reviews from Firestore)
        </p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`px-4 py-2 rounded-xl border transition-all ${
                activeTab === 'All'
                  ? 'bg-light-green/20 text-light-green border-light-green/50'
                  : 'bg-iki-grey/30 text-iki-white/80 border-light-green/10 hover:border-light-green/30'
              }`}
              onClick={() => setActiveTab('All')}
              type="button"
            >
              All
            </button>
            {CATEGORY_TABS.map((c) => (
              <button
                key={c}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === c
                    ? 'bg-light-green/20 text-light-green border-light-green/50'
                    : 'bg-iki-grey/30 text-iki-white/80 border-light-green/10 hover:border-light-green/30'
                }`}
                onClick={() => setActiveTab(c)}
                type="button"
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iki-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, speciality, services, country..."
                className="input-standard pl-9 w-full sm:w-[360px]"
              />
            </div>

            <button
              className="btn-secondary"
              onClick={() => fetchProviders({ forceRefresh: true })}
              type="button"
              disabled={loading}
            >
              Refresh
            </button>

            <button className="btn-primary" onClick={openCreate} type="button">
              <Plus className="w-4 h-4" />
              Add provider
            </button>
          </div>
        </div>

        <div className="mt-6">
          {error && <div className="text-red-400 mb-4">{error}</div>}

          <div className="table-container">
            <div className="table-header">
              <div className="grid grid-cols-12 gap-2">
                <div className="table-header-cell col-span-3">Provider</div>
                <div className="table-header-cell col-span-2">Speciality</div>
                <div className="table-header-cell col-span-2">Country</div>
                <div className="table-header-cell col-span-3">Categories</div>
                <div className="table-header-cell col-span-2 text-right">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-light-green/10">
              {loading ? (
                <div className="table-cell text-iki-white/70">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="table-cell text-iki-white/70">No providers found.</div>
              ) : (
                providers
                  .filter((p) => {
                    const qq = q.trim().toLowerCase();
                    if (!qq) return true;
                    const hay = [
                      p.providerName,
                      p.speciality ?? '',
                      p.country ?? '',
                      p.location ?? '',
                      p.formattedAddress ?? '',
                      ...(p.services ?? []),
                      ...(p.inferredCategories ?? []),
                    ]
                      .join(' ')
                      .toLowerCase();
                    return hay.includes(qq);
                  })
                  .map((p) => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="table-cell col-span-3">
                        <div className="font-semibold text-iki-white truncate">{p.providerName}</div>
                        <div className="text-xs text-iki-white/60 truncate">
                          #{p.id}
                          {p.formattedAddress ? ` • ${p.formattedAddress}` : p.location ? ` • ${p.location}` : ''}
                        </div>
                      </div>
                      <div className="table-cell col-span-2 text-iki-white/80 truncate">
                        {p.speciality || '—'}
                      </div>
                      <div className="table-cell col-span-2 text-iki-white/80 truncate">
                        {p.country || '—'}
                      </div>
                      <div className="table-cell col-span-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.inferredCategories ?? []).slice(0, 3).map((c) => (
                            <span key={c} className="badge-secondary">
                              {c}
                            </span>
                          ))}
                          {(p.inferredCategories?.length ?? 0) > 3 && (
                            <span className="badge-secondary">+{p.inferredCategories.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="table-cell col-span-2 flex justify-end gap-2">
                        <button
                          className="btn-ghost"
                          title="View details"
                          onClick={() => openView(p)}
                          type="button"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost"
                          title="Edit"
                          onClick={() => openEdit(p)}
                          type="button"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost text-red-300 hover:text-red-200"
                          title="Delete"
                          onClick={() => remove(p)}
                          type="button"
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />

          <div className="relative w-full max-w-4xl bg-dark-blue rounded-2xl border border-light-green/20 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-light-green/10">
              <div>
                <div className="heading-sm font-goldplay text-iki-white">
                  {modalMode === 'create'
                    ? 'Add provider'
                    : modalMode === 'edit'
                      ? `Edit: ${selected?.providerName ?? ''}`
                      : selected
                        ? selected.providerName
                        : 'Provider'}
                </div>
                {selected && (
                  <div className="text-xs text-iki-white/60 mt-1">
                    #{selected.id}
                    {selected.speciality ? ` • ${selected.speciality}` : ''}
                    {selected.country ? ` • ${selected.country}` : ''}
                  </div>
                )}
              </div>

              <button className="btn-ghost" onClick={closeModal} type="button" disabled={saving}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {selected && modalMode !== 'create' && (
              <div className="px-5 pt-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-light-green/10 pb-3">
                  <button
                    className={`px-4 py-2 rounded-xl border transition-all ${
                      detailTab === 'details'
                        ? 'bg-light-green/20 text-light-green border-light-green/50'
                        : 'bg-iki-grey/30 text-iki-white/80 border-light-green/10 hover:border-light-green/30'
                    }`}
                    type="button"
                    onClick={() => setDetailTab('details')}
                  >
                    <Pencil className="w-4 h-4 inline-block mr-2" />
                    Details
                  </button>
                  <button
                    className={`px-4 py-2 rounded-xl border transition-all ${
                      detailTab === 'reviews'
                        ? 'bg-light-green/20 text-light-green border-light-green/50'
                        : 'bg-iki-grey/30 text-iki-white/80 border-light-green/10 hover:border-light-green/30'
                    }`}
                    type="button"
                    onClick={() => setDetailTab('reviews')}
                  >
                    <Star className="w-4 h-4 inline-block mr-2" />
                    Reviews
                  </button>
                  <button
                    className={`px-4 py-2 rounded-xl border transition-all ${
                      detailTab === 'map'
                        ? 'bg-light-green/20 text-light-green border-light-green/50'
                        : 'bg-iki-grey/30 text-iki-white/80 border-light-green/10 hover:border-light-green/30'
                    }`}
                    type="button"
                    onClick={() => setDetailTab('map')}
                  >
                    <MapPin className="w-4 h-4 inline-block mr-2" />
                    Map
                  </button>

                  <div className="ml-auto flex gap-2">
                    {modalMode === 'view' && (
                      <button className="btn-secondary" onClick={() => setModalMode('edit')} type="button">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-5">
              {detailTab === 'reviews' && selected ? (
                <div className="space-y-4">
                  <div className="card-compact">
                    <div className="flex items-center justify-between">
                      <div className="text-iki-white font-semibold">Review Summary</div>
                      {reviewStats && (
                        <div className="text-iki-white/70 text-sm">
                          Avg {reviewStats.averageRating.toFixed(2)} • {reviewStats.totalReviews} reviews
                        </div>
                      )}
                    </div>
                  </div>

                  {reviewsError && <div className="text-red-400">{reviewsError}</div>}
                  {reviewsLoading ? (
                    <div className="text-iki-white/70">Loading reviews…</div>
                  ) : reviews.length === 0 ? (
                    <div className="text-iki-white/70">No reviews found for this provider.</div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto">
                      {reviews.map((r) => (
                        <div key={r.id} className="card-compact">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-iki-white font-semibold truncate">{r.userName}</div>
                              <div className="text-xs text-iki-white/60">{r.createdAt ?? '—'}</div>
                            </div>
                            <div className="text-light-green font-semibold">{formatStars(r.rating)}</div>
                          </div>
                          {r.comment && <div className="text-iki-white/80 mt-3">{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : detailTab === 'map' && selected ? (
                <div className="space-y-4">
                  {selected.coordinates ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-iki-white/80">
                          {selected.formattedAddress || `${selected.coordinates.lat}, ${selected.coordinates.lng}`}
                        </div>
                        <a
                          href={mapsLink(selected.coordinates)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                        >
                          <MapPin className="w-4 h-4" />
                          Open in Maps
                        </a>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-light-green/20">
                        <iframe
                          title="Provider map"
                          src={mapEmbedUrl(selected.coordinates)}
                          className="w-full h-[420px]"
                          loading="lazy"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-iki-white/70">
                      No coordinates saved for this provider. Add lat/lng to enable the map view.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-iki-white/60">Provider name *</label>
                      <input
                        className="input-standard mt-1"
                        value={form.providerName}
                        onChange={(e) => setForm((s) => ({ ...s, providerName: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Speciality</label>
                      <input
                        className="input-standard mt-1"
                        value={form.speciality}
                        onChange={(e) => setForm((s) => ({ ...s, speciality: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Country</label>
                      <input
                        className="input-standard mt-1"
                        value={form.country}
                        onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Location (short)</label>
                      <input
                        className="input-standard mt-1"
                        value={form.location}
                        onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-iki-white/60">Formatted address</label>
                      <input
                        className="input-standard mt-1"
                        value={form.formattedAddress}
                        onChange={(e) => setForm((s) => ({ ...s, formattedAddress: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-iki-white/60">Physical address</label>
                      <input
                        className="input-standard mt-1"
                        value={form.physicalAddress}
                        onChange={(e) => setForm((s) => ({ ...s, physicalAddress: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-iki-white/60">Categories (comma-separated)</label>
                      <input
                        className="input-standard mt-1"
                        value={form.inferredCategoriesCsv}
                        onChange={(e) => setForm((s) => ({ ...s, inferredCategoriesCsv: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-iki-white/60">Services (comma-separated)</label>
                      <input
                        className="input-standard mt-1"
                        value={form.servicesCsv}
                        onChange={(e) => setForm((s) => ({ ...s, servicesCsv: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Telephone(s) (comma-separated)</label>
                      <input
                        className="input-standard mt-1"
                        value={form.telephoneCsv}
                        onChange={(e) => setForm((s) => ({ ...s, telephoneCsv: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Emails (comma-separated)</label>
                      <input
                        className="input-standard mt-1"
                        value={form.emailsCsv}
                        onChange={(e) => setForm((s) => ({ ...s, emailsCsv: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Latitude</label>
                      <input
                        className="input-standard mt-1"
                        value={form.lat}
                        onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iki-white/60">Longitude</label>
                      <input
                        className="input-standard mt-1"
                        value={form.lng}
                        onChange={(e) => setForm((s) => ({ ...s, lng: e.target.value }))}
                        disabled={modalMode === 'view' || saving}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-light-green/10">
                    <div className="flex gap-2">
                      {selected && modalMode !== 'create' && (
                        <button
                          className="btn-secondary text-red-200 border-red-500/40 hover:border-red-500/60"
                          onClick={() => remove(selected)}
                          type="button"
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>

                    {modalMode !== 'view' && (
                      <button className="btn-primary" onClick={save} type="button" disabled={saving}>
                        <Pencil className="w-4 h-4" />
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    )}

                    {modalMode === 'view' && (
                      <button className="btn-secondary" onClick={closeModal} type="button">
                        Close
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



