'use client';

import { downloadCsv, downloadJson } from '@/lib/export';
import { Brain, Eye, Music, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import FileUpload from './FileUpload';
import ImageUpload from './ImageUpload';

type MindfulnessCategory = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  iconName: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type MindfulnessExercise = {
  id: string;
  title: string;
  description: string;
  artist: string;
  soundcloudUrl?: string | null;
  videoUrl?: string | null;
  backgroundSoundUrl?: string | null;
  durationMinutes: number;
  imageUrl: string;
  thumbnailUrl?: string | null;
  category: string;
  tags: string[];
  difficulty: string;
  featured: boolean;
  popular: boolean;
  playCount: number;
  rating: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function parseTags(input: string) {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function isHttpUrl(value?: string | null) {
  const v = (value || '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function getErrorField(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  return typeof rec.error === 'string' ? rec.error : null;
}

async function readResponseError(res: Response): Promise<string | null> {
  const data = await res.json().catch(() => null);
  return getErrorField(data);
}

function ExerciseCard({
  exercise,
  onView,
  onEdit,
  onDelete,
}: {
  exercise: MindfulnessExercise;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = (exercise.thumbnailUrl || '').trim();
  const img = (exercise.imageUrl || '').trim();
  const thumbSrc = isHttpUrl(thumb) ? thumb : null;
  const imageSrc = !thumbSrc && isHttpUrl(img) ? img : null;

  return (
    <div className="glass rounded-2xl p-4 border border-light-green/10 hover:border-light-green/30 transition-all">
      <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-iki-grey/20">
        {thumbSrc ? (
          <img src={thumbSrc} alt={exercise.title} className="w-full h-full object-cover" />
        ) : imageSrc ? (
          <img src={imageSrc} alt={exercise.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-iki-grey/30">
            <Music className="w-10 h-10 text-iki-white/50" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
          <span className="text-xs text-white">{exercise.durationMinutes}m</span>
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
          <span className="text-xs text-white capitalize">{exercise.category}</span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-iki-white body-sm mb-1 line-clamp-2">{exercise.title}</h3>
          <p className="text-iki-white/60 text-xs truncate">{exercise.artist}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] border ${
                exercise.isActive
                  ? 'bg-green-500/10 text-green-300 border-green-500/20'
                  : 'bg-red-500/10 text-red-300 border-red-500/20'
              }`}
            >
              {exercise.isActive ? 'Active' : 'Inactive'}
            </span>
            {exercise.featured && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Featured
              </span>
            )}
            {exercise.popular && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Popular
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="p-2 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 text-iki-white/80 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Large admin UI component.
export default function MindfulnessContent() {
  const [section, setSection] = useState<'exercises' | 'categories'>('exercises');

  const [categories, setCategories] = useState<MindfulnessCategory[]>([]);
  const [exercises, setExercises] = useState<MindfulnessExercise[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // -------- Fetchers
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/mindfulness/categories?limit=500');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to fetch categories'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchExercises = async () => {
    try {
      setLoadingExercises(true);
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (filterCategory) params.set('category', filterCategory);
      // Keep inactive visible in admin; we filter client-side.
      const res = await fetch(`/api/mindfulness/exercises?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch exercises');
      const data = await res.json();
      setExercises(Array.isArray(data.exercises) ? data.exercises : []);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to fetch exercises'));
    } finally {
      setLoadingExercises(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchers are stable within this component
  useEffect(() => {
    // Initial load
    fetchCategories();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchers are stable within this component
  useEffect(() => {
    fetchExercises();
  }, [filterCategory]);

  // -------- Derived lists
  const categoryOptions = useMemo(() => {
    const active = [...categories]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => ({
        id: c.id,
        name: (c.name || c.id || '').toLowerCase(),
        displayName: c.displayName || c.name || c.id,
      }));
    const unique = new Map<string, { id: string; name: string; displayName: string }>();
    for (const c of active) {
      if (!c.name) continue;
      unique.set(c.name, c);
    }
    return Array.from(unique.values());
  }, [categories]);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = exercises.filter((e) => {
      if (filterActive === 'active' && !e.isActive) return false;
      if (filterActive === 'inactive' && e.isActive) return false;
      if (!q) return true;
      const hay = [
        e.title,
        e.description,
        e.artist,
        e.category,
        ...(Array.isArray(e.tags) ? e.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    // Stable, useful ordering for admin
    return [...list].sort((a, b) => {
      const ap = a.playCount ?? 0;
      const bp = b.playCount ?? 0;
      if (bp !== ap) return bp - ap;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [exercises, filterActive, searchQuery]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = categories.filter((c) => {
      if (filterActive === 'active' && !c.isActive) return false;
      if (filterActive === 'inactive' && c.isActive) return false;
      if (!q) return true;
      const hay = [c.id, c.name, c.displayName, c.description, c.iconName, c.color]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories, filterActive, searchQuery]);

  // -------- Export
  const exportExercises = (format: 'csv' | 'json') => {
    const rows = filteredExercises.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      difficulty: e.difficulty,
      durationMinutes: e.durationMinutes,
      featured: e.featured,
      popular: e.popular,
      isActive: e.isActive,
      playCount: e.playCount,
      rating: e.rating,
      soundcloudUrl: e.soundcloudUrl ?? '',
      backgroundSoundUrl: e.backgroundSoundUrl ?? '',
      thumbnailUrl: e.thumbnailUrl ?? '',
      imageUrl: e.imageUrl ?? '',
      tags: (e.tags || []).join(','),
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') return downloadJson(`mindfulness-exercises-${stamp}.json`, rows);
    return downloadCsv(`mindfulness-exercises-${stamp}.csv`, rows);
  };

  const exportCategories = (format: 'csv' | 'json') => {
    const rows = filteredCategories.map((c) => ({
      id: c.id,
      name: c.name,
      displayName: c.displayName,
      description: c.description,
      iconName: c.iconName,
      color: c.color,
      order: c.order,
      isActive: c.isActive,
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') return downloadJson(`mindfulness-categories-${stamp}.json`, rows);
    return downloadCsv(`mindfulness-categories-${stamp}.csv`, rows);
  };

  // -------- Create / Edit state (Categories)
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    displayName: '',
    description: '',
    iconName: 'self_improvement',
    color: '#6C63FF',
    order: 0,
    isActive: true,
  });

  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<typeof categoryForm | null>(null);

  const openEditCategory = (c: MindfulnessCategory) => {
    setEditCategoryId(c.id);
    setEditCategoryForm({
      id: c.id || '',
      name: (c.name || c.id || '').toLowerCase(),
      displayName: c.displayName || c.name || '',
      description: c.description || '',
      iconName: c.iconName || 'self_improvement',
      color: c.color || '#6C63FF',
      order: typeof c.order === 'number' ? c.order : 0,
      isActive: c.isActive !== false,
    });
    setIsEditCategoryOpen(true);
  };

  const handleCreateCategory = async () => {
    const id = (categoryForm.id || categoryForm.name || '').trim();
    const name = (categoryForm.name || id).trim().toLowerCase();
    const displayName = (categoryForm.displayName || name).trim();
    if (!id || !name || !displayName) {
      alert('Please provide id (or name), name, and displayName.');
      return;
    }
    try {
      setCreatingCategory(true);
      const res = await fetch('/api/mindfulness/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          id,
          name,
          displayName,
          order: Number.isFinite(categoryForm.order) ? categoryForm.order : 0,
        }),
      });
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to create category');
      }
      setIsCreateCategoryOpen(false);
      setCategoryForm({
        id: '',
        name: '',
        displayName: '',
        description: '',
        iconName: 'self_improvement',
        color: '#6C63FF',
        order: 0,
        isActive: true,
      });
      await fetchCategories();
      alert('Category created.');
    } catch (err: unknown) {
      alert(`Failed to create category: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setCreatingCategory(false);
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Admin handler validates and updates several fields.
  const handleUpdateCategory = async () => {
    if (!editCategoryId || !editCategoryForm) return;
    const name = (editCategoryForm.name || editCategoryId).trim().toLowerCase();
    const displayName = (editCategoryForm.displayName || name).trim();
    if (!name || !displayName) {
      alert('Please provide name and displayName.');
      return;
    }
    try {
      setEditingCategory(true);
      const res = await fetch('/api/mindfulness/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editCategoryId,
          ...editCategoryForm,
          name,
          displayName,
          order: Number.isFinite(editCategoryForm.order) ? editCategoryForm.order : 0,
        }),
      });
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to update category');
      }
      setIsEditCategoryOpen(false);
      setEditCategoryId(null);
      setEditCategoryForm(null);
      await fetchCategories();
      alert('Category updated.');
    } catch (err: unknown) {
      alert(`Failed to update category: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setEditingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    try {
      const res = await fetch(
        `/api/mindfulness/categories?categoryId=${encodeURIComponent(categoryId)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to delete category');
      }
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } catch (err: unknown) {
      alert(`Failed to delete category: ${errorMessage(err, 'Unknown error')}`);
    }
  };

  // -------- Create / Edit state (Exercises)
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    id: '',
    title: '',
    description: '',
    artist: 'Unknown',
    soundcloudUrl: '',
    backgroundSoundUrl: '',
    videoUrl: '',
    durationMinutes: 5,
    imageUrl: '',
    thumbnailUrl: '',
    category: filterCategory || 'meditation',
    tags: '',
    difficulty: 'beginner',
    featured: false,
    popular: false,
    isActive: true,
  });

  const [selectedExercise, setSelectedExercise] = useState<MindfulnessExercise | null>(null);

  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null);
  const [editExerciseForm, setEditExerciseForm] = useState<typeof exerciseForm | null>(null);

  const openEditExercise = (e: MindfulnessExercise) => {
    setEditExerciseId(e.id);
    setEditExerciseForm({
      id: e.id,
      title: e.title || '',
      description: e.description || '',
      artist: e.artist || 'Unknown',
      soundcloudUrl: (e.soundcloudUrl || '') as string,
      backgroundSoundUrl: (e.backgroundSoundUrl || '') as string,
      videoUrl: (e.videoUrl || '') as string,
      durationMinutes: typeof e.durationMinutes === 'number' ? e.durationMinutes : 5,
      imageUrl: e.imageUrl || '',
      thumbnailUrl: (e.thumbnailUrl || '') as string,
      category: (e.category || 'meditation').toLowerCase(),
      tags: (e.tags || []).join(', '),
      difficulty: e.difficulty || 'beginner',
      featured: !!e.featured,
      popular: !!e.popular,
      isActive: e.isActive !== false,
    });
    setIsEditExerciseOpen(true);
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Admin handler validates and creates several fields.
  const handleCreateExercise = async () => {
    const title = exerciseForm.title.trim();
    const category = (exerciseForm.category || '').trim().toLowerCase();
    if (!title || !category) {
      alert('Please provide title and category.');
      return;
    }
    try {
      setCreatingExercise(true);
      const res = await fetch('/api/mindfulness/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exerciseForm,
          title,
          category,
          tags: parseTags(exerciseForm.tags),
          durationMinutes: clamp(Number(exerciseForm.durationMinutes) || 5, 1, 600),
          rating: 0,
          playCount: 0,
          // Keep nulls as null in Firestore
          soundcloudUrl: exerciseForm.soundcloudUrl.trim() || null,
          backgroundSoundUrl: exerciseForm.backgroundSoundUrl.trim() || null,
          videoUrl: exerciseForm.videoUrl.trim() || null,
          imageUrl:
            exerciseForm.imageUrl.trim() || 'https://source.unsplash.com/featured/?meditation',
          thumbnailUrl: exerciseForm.thumbnailUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to create exercise');
      }
      setIsCreateExerciseOpen(false);
      setExerciseForm({
        id: '',
        title: '',
        description: '',
        artist: 'Unknown',
        soundcloudUrl: '',
        backgroundSoundUrl: '',
        videoUrl: '',
        durationMinutes: 5,
        imageUrl: '',
        thumbnailUrl: '',
        category: filterCategory || 'meditation',
        tags: '',
        difficulty: 'beginner',
        featured: false,
        popular: false,
        isActive: true,
      });
      await fetchExercises();
      alert('Exercise created.');
    } catch (err: unknown) {
      alert(`Failed to create exercise: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setCreatingExercise(false);
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Admin handler validates and updates several fields.
  const handleUpdateExercise = async () => {
    if (!editExerciseId || !editExerciseForm) return;
    const title = editExerciseForm.title.trim();
    const category = (editExerciseForm.category || '').trim().toLowerCase();
    if (!title || !category) {
      alert('Please provide title and category.');
      return;
    }
    try {
      setEditingExercise(true);
      const res = await fetch('/api/mindfulness/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: editExerciseId,
          ...editExerciseForm,
          title,
          category,
          tags: parseTags(editExerciseForm.tags),
          durationMinutes: clamp(Number(editExerciseForm.durationMinutes) || 5, 1, 600),
          soundcloudUrl: editExerciseForm.soundcloudUrl.trim() || null,
          backgroundSoundUrl: editExerciseForm.backgroundSoundUrl.trim() || null,
          videoUrl: editExerciseForm.videoUrl.trim() || null,
          imageUrl: editExerciseForm.imageUrl.trim() || '',
          thumbnailUrl: editExerciseForm.thumbnailUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to update exercise');
      }
      setIsEditExerciseOpen(false);
      setEditExerciseId(null);
      setEditExerciseForm(null);
      await fetchExercises();
      alert('Exercise updated.');
    } catch (err: unknown) {
      alert(`Failed to update exercise: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setEditingExercise(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Delete this exercise? This cannot be undone.')) return;
    try {
      const res = await fetch(
        `/api/mindfulness/exercises?exerciseId=${encodeURIComponent(exerciseId)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const apiError = await readResponseError(res);
        throw new Error(apiError || 'Failed to delete exercise');
      }
      setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
      if (selectedExercise?.id === exerciseId) setSelectedExercise(null);
    } catch (err: unknown) {
      alert(`Failed to delete exercise: ${errorMessage(err, 'Unknown error')}`);
    }
  };

  const headerTitle = section === 'exercises' ? 'Mindfulness Exercises' : 'Mindfulness Categories';
  const headerSubtitle =
    section === 'exercises'
      ? 'Create and manage mindfulness exercises (audio/video, metadata)'
      : 'Manage categories used for filtering and navigation';

  const isLoading = section === 'exercises' ? loadingExercises : loadingCategories;
  const count = section === 'exercises' ? filteredExercises.length : filteredCategories.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 border border-light-green/10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="heading-md font-goldplay text-iki-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-light-green" />
              {headerTitle}
            </h2>
            <p className="body-sm text-iki-white/60 font-tsukimi mt-1">{headerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                section === 'exercises' ? exportExercises('csv') : exportCategories('csv')
              }
              disabled={count === 0}
              className="px-4 py-2 rounded-full bg-iki-grey/30 text-iki-white border border-light-green/20 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                section === 'exercises' ? exportExercises('json') : exportCategories('json')
              }
              disabled={count === 0}
              className="px-4 py-2 rounded-full bg-iki-grey/30 text-iki-white border border-light-green/20 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export JSON
            </button>

            {section === 'exercises' ? (
              <button
                type="button"
                onClick={() => setIsCreateExerciseOpen(true)}
                className="px-4 py-2 rounded-full bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors flex items-center gap-2 body-sm font-tsukimi"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateCategoryOpen(true)}
                className="px-4 py-2 rounded-full bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors flex items-center gap-2 body-sm font-tsukimi"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        </div>

        {/* Section Toggle */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setSection('exercises')}
            className={`px-4 py-2 rounded-xl transition-colors body-sm font-tsukimi ${
              section === 'exercises'
                ? 'bg-light-green/20 text-light-green border border-light-green/30'
                : 'bg-iki-grey/30 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/40'
            }`}
          >
            Exercises
          </button>
          <button
            type="button"
            onClick={() => setSection('categories')}
            className={`px-4 py-2 rounded-xl transition-colors body-sm font-tsukimi ${
              section === 'categories'
                ? 'bg-light-green/20 text-light-green border border-light-green/30'
                : 'bg-iki-grey/30 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/40'
            }`}
          >
            Categories
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter (exercises only) */}
          <div>
            <label
              htmlFor="mindfulness-filter-category"
              className="block text-sm font-medium text-iki-white/80 mb-2"
            >
              Category
            </label>
            <select
              id="mindfulness-filter-category"
              disabled={section !== 'exercises'}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50 disabled:opacity-50"
            >
              <option value="">{section === 'exercises' ? 'All Categories' : '—'}</option>
              {categoryOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter */}
          <div>
            <label
              htmlFor="mindfulness-filter-active"
              className="block text-sm font-medium text-iki-white/80 mb-2"
            >
              Status
            </label>
            <select
              id="mindfulness-filter-active"
              value={filterActive}
              onChange={(e) => {
                const next = e.target.value;
                if (next === 'all' || next === 'active' || next === 'inactive') {
                  setFilterActive(next);
                }
              }}
              className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label
              htmlFor="mindfulness-search"
              className="block text-sm font-medium text-iki-white/80 mb-2"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-iki-white/40" />
              <input
                id="mindfulness-search"
                type="text"
                placeholder={
                  section === 'exercises' ? 'Search exercises...' : 'Search categories...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50 placeholder:text-iki-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass rounded-2xl p-4 border border-red-500/20 bg-red-500/10">
          <p className="text-red-400 body-sm">{error}</p>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-green mx-auto" />
          <p className="text-iki-white/60 body-sm font-tsukimi mt-4">Loading...</p>
        </div>
      ) : section === 'exercises' ? (
        filteredExercises.length === 0 ? (
          <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
            <Music className="w-16 h-16 text-iki-white/20 mx-auto mb-4" />
            <p className="text-iki-white/60 body-md font-tsukimi">No exercises found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((e) => (
              <ExerciseCard
                key={e.id}
                exercise={e}
                onView={() => setSelectedExercise(e)}
                onEdit={() => openEditExercise(e)}
                onDelete={() => handleDeleteExercise(e.id)}
              />
            ))}
          </div>
        )
      ) : filteredCategories.length === 0 ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <Tag className="w-16 h-16 text-iki-white/20 mx-auto mb-4" />
          <p className="text-iki-white/60 body-md font-tsukimi">No categories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((c) => (
            <div
              key={c.id}
              className="glass rounded-2xl p-4 border border-light-green/10 hover:border-light-green/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/10"
                      style={{ backgroundColor: c.color || '#6C63FF' }}
                      title={c.color}
                    />
                    <h3 className="font-medium text-iki-white body-sm truncate">
                      {c.displayName || c.name || c.id}
                    </h3>
                  </div>
                  <p className="text-iki-white/60 text-xs truncate">
                    id: <span className="font-mono">{c.id}</span> • order: {c.order ?? 0}
                  </p>
                  {c.description && (
                    <p className="text-iki-white/60 text-xs mt-2 line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        c.isActive
                          ? 'bg-green-500/10 text-green-300 border-green-500/20'
                          : 'bg-red-500/10 text-red-300 border-red-500/20'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCategory(c)}
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -------- Exercise detail modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Exercise Details</h3>
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <span className="text-iki-white/60">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Title</h4>
                <p className="text-iki-white body-md">{selectedExercise.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Category</h4>
                  <p className="text-iki-white body-sm capitalize">{selectedExercise.category}</p>
                </div>
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Duration</h4>
                  <p className="text-iki-white body-sm">{selectedExercise.durationMinutes} min</p>
                </div>
              </div>
              {selectedExercise.description && (
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Description</h4>
                  <p className="text-iki-white body-sm whitespace-pre-wrap">
                    {selectedExercise.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Audio URL (soundcloudUrl)</h4>
                <p className="text-iki-white/90 text-sm break-all">
                  {selectedExercise.soundcloudUrl || '-'}
                </p>
                {isHttpUrl(selectedExercise.soundcloudUrl) && (
                  <div className="mt-3 rounded-xl bg-black/20 border border-white/10 p-3">
                    {/* biome-ignore lint/a11y/useMediaCaption: Admin-only preview player */}
                    <audio
                      controls
                      src={selectedExercise.soundcloudUrl ?? undefined}
                      className="w-full"
                    />
                    <div className="text-xs text-iki-white/50 mt-2">
                      Tip: Flutter plays <span className="font-mono">soundcloudUrl</span> via{' '}
                      <span className="font-mono">just_audio</span>. Use a direct audio URL
                      (mp3/m4a) or a script folder URL.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Background Sound URL</h4>
                <p className="text-iki-white/90 text-sm break-all">
                  {selectedExercise.backgroundSoundUrl || '-'}
                </p>
                {isHttpUrl(selectedExercise.backgroundSoundUrl) && (
                  <div className="mt-3 rounded-xl bg-black/20 border border-white/10 p-3">
                    {/* biome-ignore lint/a11y/useMediaCaption: Admin-only preview player */}
                    <audio
                      controls
                      src={selectedExercise.backgroundSoundUrl ?? undefined}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {selectedExercise.tags?.length ? (
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.tags.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-full bg-light-green/10 text-light-green border border-light-green/20 body-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => openEditExercise(selectedExercise)}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors body-sm font-tsukimi"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExercise(selectedExercise.id)}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors body-sm font-tsukimi"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExercise(null)}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- Create Exercise Modal */}
      {isCreateExerciseOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Add Exercise</h3>
              <button
                type="button"
                onClick={() => setIsCreateExerciseOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <span className="text-iki-white/60">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-exercise-create-id"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    ID (optional)
                  </label>
                  <input
                    id="mindfulness-exercise-create-id"
                    value={exerciseForm.id}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, id: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="leave blank to auto-generate"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-exercise-create-duration"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Duration (minutes)
                  </label>
                  <input
                    id="mindfulness-exercise-create-duration"
                    type="number"
                    value={exerciseForm.durationMinutes}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        durationMinutes: Number.isFinite(e.target.valueAsNumber)
                          ? e.target.valueAsNumber
                          : 5,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-title"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Title *
                </label>
                <input
                  id="mindfulness-exercise-create-title"
                  value={exerciseForm.title}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-exercise-create-category"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Category *
                  </label>
                  <select
                    id="mindfulness-exercise-create-category"
                    value={exerciseForm.category}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    {categoryOptions.length ? null : <option value="meditation">meditation</option>}
                    {categoryOptions.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-exercise-create-difficulty"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Difficulty
                  </label>
                  <select
                    id="mindfulness-exercise-create-difficulty"
                    value={exerciseForm.difficulty}
                    onChange={(e) =>
                      setExerciseForm({ ...exerciseForm, difficulty: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-artist"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Artist
                </label>
                <input
                  id="mindfulness-exercise-create-artist"
                  value={exerciseForm.artist}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, artist: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Unknown"
                />
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-audio"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Audio URL (soundcloudUrl)
                </label>
                <input
                  id="mindfulness-exercise-create-audio"
                  value={exerciseForm.soundcloudUrl}
                  onChange={(e) =>
                    setExerciseForm({ ...exerciseForm, soundcloudUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://.../audio.mp3"
                />
                <div className="mt-3">
                  <FileUpload
                    kind="audio"
                    label="Or upload voice audio"
                    folder="mindfulness/voice"
                    accept="audio/*"
                    maxSizeMb={50}
                    currentUrl={exerciseForm.soundcloudUrl}
                    onUploadComplete={(url) =>
                      setExerciseForm({ ...exerciseForm, soundcloudUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-background"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Background Sound URL
                </label>
                <input
                  id="mindfulness-exercise-create-background"
                  value={exerciseForm.backgroundSoundUrl}
                  onChange={(e) =>
                    setExerciseForm({ ...exerciseForm, backgroundSoundUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://.../background.mp3"
                />
                <div className="mt-3">
                  <FileUpload
                    kind="audio"
                    label="Or upload background audio"
                    folder="mindfulness/background"
                    accept="audio/*"
                    maxSizeMb={50}
                    currentUrl={exerciseForm.backgroundSoundUrl}
                    onUploadComplete={(url) =>
                      setExerciseForm({ ...exerciseForm, backgroundSoundUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-thumbnail"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Thumbnail URL
                </label>
                <input
                  id="mindfulness-exercise-create-thumbnail"
                  value={exerciseForm.thumbnailUrl}
                  onChange={(e) =>
                    setExerciseForm({
                      ...exerciseForm,
                      thumbnailUrl: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://.../thumb.jpg"
                />
                <div className="mt-3">
                  <ImageUpload
                    label="Or upload thumbnail image"
                    folder="mindfulness/thumbnails"
                    currentUrl={exerciseForm.thumbnailUrl}
                    onUploadComplete={(url) =>
                      setExerciseForm({ ...exerciseForm, thumbnailUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-image"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Image URL
                </label>
                <input
                  id="mindfulness-exercise-create-image"
                  value={exerciseForm.imageUrl}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://.../image.jpg (fallback artwork)"
                />
                <div className="mt-3">
                  <ImageUpload
                    label="Or upload image"
                    folder="mindfulness/images"
                    currentUrl={exerciseForm.imageUrl}
                    onUploadComplete={(url) => setExerciseForm({ ...exerciseForm, imageUrl: url })}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-description"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="mindfulness-exercise-create-description"
                  value={exerciseForm.description}
                  onChange={(e) =>
                    setExerciseForm({ ...exerciseForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-create-tags"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="mindfulness-exercise-create-tags"
                  value={exerciseForm.tags}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, tags: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="stress, sleep, breathing"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={exerciseForm.isActive}
                    onChange={(e) =>
                      setExerciseForm({ ...exerciseForm, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={exerciseForm.featured}
                    onChange={(e) =>
                      setExerciseForm({ ...exerciseForm, featured: e.target.checked })
                    }
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={exerciseForm.popular}
                    onChange={(e) =>
                      setExerciseForm({ ...exerciseForm, popular: e.target.checked })
                    }
                  />
                  Popular
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCreateExercise}
                  disabled={creatingExercise}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {creatingExercise ? 'Creating...' : 'Create Exercise'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateExerciseOpen(false)}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- Edit Exercise Modal */}
      {isEditExerciseOpen && editExerciseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Edit Exercise</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditExerciseOpen(false);
                  setEditExerciseId(null);
                  setEditExerciseForm(null);
                }}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <span className="text-iki-white/60">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-exercise-edit-title"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Title *
                  </label>
                  <input
                    id="mindfulness-exercise-edit-title"
                    value={editExerciseForm.title}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, title: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-exercise-edit-category"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Category *
                  </label>
                  <select
                    id="mindfulness-exercise-edit-category"
                    value={editExerciseForm.category}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, category: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    {categoryOptions.length ? null : <option value="meditation">meditation</option>}
                    {categoryOptions.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-exercise-edit-duration"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Duration (minutes)
                  </label>
                  <input
                    id="mindfulness-exercise-edit-duration"
                    type="number"
                    value={editExerciseForm.durationMinutes}
                    onChange={(e) =>
                      setEditExerciseForm({
                        ...editExerciseForm,
                        durationMinutes: Number.isFinite(e.target.valueAsNumber)
                          ? e.target.valueAsNumber
                          : 5,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-exercise-edit-difficulty"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Difficulty
                  </label>
                  <select
                    id="mindfulness-exercise-edit-difficulty"
                    value={editExerciseForm.difficulty}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, difficulty: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-artist"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Artist
                </label>
                <input
                  id="mindfulness-exercise-edit-artist"
                  value={editExerciseForm.artist}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, artist: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-audio"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Audio URL (soundcloudUrl)
                </label>
                <input
                  id="mindfulness-exercise-edit-audio"
                  value={editExerciseForm.soundcloudUrl}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, soundcloudUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
                <div className="mt-3">
                  <FileUpload
                    kind="audio"
                    label="Or upload voice audio"
                    folder="mindfulness/voice"
                    accept="audio/*"
                    maxSizeMb={50}
                    currentUrl={editExerciseForm.soundcloudUrl}
                    onUploadComplete={(url) =>
                      setEditExerciseForm({ ...editExerciseForm, soundcloudUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-background"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Background Sound URL
                </label>
                <input
                  id="mindfulness-exercise-edit-background"
                  value={editExerciseForm.backgroundSoundUrl}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, backgroundSoundUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
                <div className="mt-3">
                  <FileUpload
                    kind="audio"
                    label="Or upload background audio"
                    folder="mindfulness/background"
                    accept="audio/*"
                    maxSizeMb={50}
                    currentUrl={editExerciseForm.backgroundSoundUrl}
                    onUploadComplete={(url) =>
                      setEditExerciseForm({ ...editExerciseForm, backgroundSoundUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-thumbnail"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Thumbnail URL
                </label>
                <input
                  id="mindfulness-exercise-edit-thumbnail"
                  value={editExerciseForm.thumbnailUrl}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, thumbnailUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
                <div className="mt-3">
                  <ImageUpload
                    label="Or upload thumbnail image"
                    folder="mindfulness/thumbnails"
                    currentUrl={editExerciseForm.thumbnailUrl}
                    onUploadComplete={(url) =>
                      setEditExerciseForm({ ...editExerciseForm, thumbnailUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-image"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Image URL
                </label>
                <input
                  id="mindfulness-exercise-edit-image"
                  value={editExerciseForm.imageUrl}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, imageUrl: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
                <div className="mt-3">
                  <ImageUpload
                    label="Or upload image"
                    folder="mindfulness/images"
                    currentUrl={editExerciseForm.imageUrl}
                    onUploadComplete={(url) =>
                      setEditExerciseForm({ ...editExerciseForm, imageUrl: url })
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-description"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="mindfulness-exercise-edit-description"
                  value={editExerciseForm.description}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
              </div>

              <div>
                <label
                  htmlFor="mindfulness-exercise-edit-tags"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="mindfulness-exercise-edit-tags"
                  value={editExerciseForm.tags}
                  onChange={(e) =>
                    setEditExerciseForm({ ...editExerciseForm, tags: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={editExerciseForm.isActive}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={editExerciseForm.featured}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, featured: e.target.checked })
                    }
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={editExerciseForm.popular}
                    onChange={(e) =>
                      setEditExerciseForm({ ...editExerciseForm, popular: e.target.checked })
                    }
                  />
                  Popular
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleUpdateExercise}
                  disabled={editingExercise}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {editingExercise ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditExerciseOpen(false);
                    setEditExerciseId(null);
                    setEditExerciseForm(null);
                  }}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- Create Category Modal */}
      {isCreateCategoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Add Category</h3>
              <button
                type="button"
                onClick={() => setIsCreateCategoryOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <span className="text-iki-white/60">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-create-id"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    ID *
                  </label>
                  <input
                    id="mindfulness-category-create-id"
                    value={categoryForm.id}
                    onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="meditation"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-category-create-name"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Name *
                  </label>
                  <input
                    id="mindfulness-category-create-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="meditation"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-category-create-displayName"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Display Name *
                </label>
                <input
                  id="mindfulness-category-create-displayName"
                  value={categoryForm.displayName}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Meditation"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-create-iconName"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Icon Name
                  </label>
                  <input
                    id="mindfulness-category-create-iconName"
                    value={categoryForm.iconName}
                    onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="self_improvement"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-category-create-color"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Color
                  </label>
                  <input
                    id="mindfulness-category-create-color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="#6C63FF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-create-order"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Order
                  </label>
                  <input
                    id="mindfulness-category-create-order"
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        order: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm mt-8">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-category-create-description"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="mindfulness-category-create-description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter description"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {creatingCategory ? 'Creating...' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryOpen(false)}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- Edit Category Modal */}
      {isEditCategoryOpen && editCategoryForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Edit Category</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditCategoryOpen(false);
                  setEditCategoryId(null);
                  setEditCategoryForm(null);
                }}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <span className="text-iki-white/60">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="mindfulness-category-edit-id"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  ID
                </label>
                <input
                  id="mindfulness-category-edit-id"
                  value={editCategoryForm.id}
                  readOnly
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/20 border border-light-green/10 text-iki-white/60 body-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-edit-name"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Name
                  </label>
                  <input
                    id="mindfulness-category-edit-name"
                    value={editCategoryForm.name}
                    onChange={(e) =>
                      setEditCategoryForm({ ...editCategoryForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-category-edit-displayName"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Display Name
                  </label>
                  <input
                    id="mindfulness-category-edit-displayName"
                    value={editCategoryForm.displayName}
                    onChange={(e) =>
                      setEditCategoryForm({ ...editCategoryForm, displayName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-edit-iconName"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Icon Name
                  </label>
                  <input
                    id="mindfulness-category-edit-iconName"
                    value={editCategoryForm.iconName}
                    onChange={(e) =>
                      setEditCategoryForm({ ...editCategoryForm, iconName: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mindfulness-category-edit-color"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Color
                  </label>
                  <input
                    id="mindfulness-category-edit-color"
                    value={editCategoryForm.color}
                    onChange={(e) =>
                      setEditCategoryForm({ ...editCategoryForm, color: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="mindfulness-category-edit-order"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Order
                  </label>
                  <input
                    id="mindfulness-category-edit-order"
                    type="number"
                    value={editCategoryForm.order}
                    onChange={(e) =>
                      setEditCategoryForm({
                        ...editCategoryForm,
                        order: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>
                <label className="flex items-center gap-2 text-iki-white/80 text-sm mt-8">
                  <input
                    type="checkbox"
                    checked={editCategoryForm.isActive}
                    onChange={(e) =>
                      setEditCategoryForm({ ...editCategoryForm, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>

              <div>
                <label
                  htmlFor="mindfulness-category-edit-description"
                  className="block text-sm font-medium text-iki-white/80 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="mindfulness-category-edit-description"
                  value={editCategoryForm.description}
                  onChange={(e) =>
                    setEditCategoryForm({ ...editCategoryForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  disabled={editingCategory}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {editingCategory ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCategoryOpen(false);
                    setEditCategoryId(null);
                    setEditCategoryForm(null);
                  }}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

