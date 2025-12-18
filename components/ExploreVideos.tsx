'use client';

import { downloadCsv, downloadJson } from '@/lib/export';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Eye,
  FileText,
  Filter,
  Music,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FileUpload from './FileUpload';
import ImageUpload from './ImageUpload';

interface ExploreVideo {
  id: string;
  created_at: string;
  priority?: number;
  thumbnail: string;
  title: string;
  media_type: string;
  img_url: string;
  media_url: string;
  media_text: string;
  media_category: string;
  media_tags: string[];
  media_desc: string;
}

interface ExploreDate {
  dateId: string;
  exists: boolean;
  videoCount: number;
}

const MEDIA_TYPES = ['video', 'audio', 'article'];
const MEDIA_CATEGORIES = ['fitness', 'nutrition', 'mindfulness', 'finance', 'mood'];

type ExploreContentForm = {
  title: string;
  media_type: string;
  media_url: string;
  img_url: string;
  thumbnail: string;
  media_text: string;
  media_desc: string;
  media_category: string;
  media_tags: string;
  priority: number;
  dateId: string;
};

function generateDateId(date?: Date): string {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatDateId(dateId: string): string {
  if (dateId.length === 8) {
    const year = dateId.substring(0, 4);
    const month = dateId.substring(4, 6);
    const day = dateId.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return dateId;
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberFromUnknown(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function stringFromUnknown(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseTags(tags: string) {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function validateExploreForm(form: ExploreContentForm) {
  const type = (form.media_type || '').toLowerCase();
  const hasUrl = !!form.media_url?.trim();
  const hasText = !!form.media_text?.trim();

  if (!form.title || !form.media_category) {
    return 'Please fill in all required fields (title, category).';
  }

  if (type === 'article') {
    if (!hasUrl && !hasText) {
      return 'For articles, provide either an Article URL or Markdown content.';
    }
    return null;
  }

  if (!hasUrl) {
    return 'Please provide a media URL (or upload a file) for audio/video.';
  }

  if (type === 'video') {
    const u = form.media_url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) {
      return 'YouTube links are not supported. Please provide a direct video URL (e.g. mp4).';
    }
  }

  return null;
}

function flattenText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (isRecord(node) && 'props' in node) {
    const maybeEl = node as { props?: { children?: unknown } };
    return flattenText(maybeEl.props?.children);
  }
  return '';
}

function countWords(text: string): number {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function formatReadingTime(words: number): string {
  if (words <= 0) return '0 min';
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min`;
}

function MarkdownPreview({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const caption = (alt || '').trim();
            const url = typeof src === 'string' ? src.trim() : '';
            if (!url) return null;
            return (
              <figure className="my-4">
                <img src={url} alt={caption} className="w-full rounded-xl border border-white/10" />
                {caption && (
                  <figcaption className="mt-2 text-xs text-iki-white/60 italic text-center">
                    {caption}
                  </figcaption>
                )}
              </figure>
            );
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-white/10">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 px-3 py-2 text-left text-iki-white bg-black/20">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2 text-iki-white/90 align-top">
              {children}
            </td>
          ),
          p: ({ children }) => {
            const text = flattenText(children).trimStart();
            if (text.startsWith('^')) {
              const caption = text.replace(/^\^\s*/, '').trim();
              return <p className="my-2 text-xs text-iki-white/60 italic text-center">{caption}</p>;
            }
            return <p className="my-3 text-iki-white/90 leading-relaxed">{children}</p>;
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold text-iki-white mt-4 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-iki-white mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-iki-white mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold text-iki-white mt-4 mb-2">{children}</h4>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-light-green underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-light-green/40 pl-4 text-iki-white/85 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc pl-6 space-y-1 text-iki-white/90">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal pl-6 space-y-1 text-iki-white/90">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-6 border-white/10" />,
          code: ({ className, children }) => {
            const raw = flattenText(children);
            const hasLanguage = typeof className === 'string' && className.includes('language-');
            const isBlock = hasLanguage || raw.includes('\n');

            if (!isBlock) {
              return (
                <code className="px-1 py-0.5 rounded bg-black/30 border border-white/10 text-iki-white/90">
                  {children}
                </code>
              );
            }
            return (
              <code className="block text-sm text-iki-white/90 font-mono leading-6 whitespace-pre">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 p-4 rounded-xl bg-black/30 border border-white/10 overflow-x-auto">
              {children}
            </pre>
          ),
        }}
      >
        {value || ''}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownComposer({
  id,
  value,
  onChange,
  placeholder,
  uploadFolder,
  fill,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  uploadFolder: string;
  fill?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [view, setView] = useState<'split' | 'write' | 'preview'>('split');
  const words = countWords(value);

  const applyEdit = (
    fn: (
      current: string,
      start: number,
      end: number
    ) => {
      next: string;
      nextSelectionStart: number;
      nextSelectionEnd: number;
    }
  ) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const { next, nextSelectionStart, nextSelectionEnd } = fn(value, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.selectionStart = nextSelectionStart;
      target.selectionEnd = nextSelectionEnd;
    });
  };

  const wrapSelection = (left: string, right = left) => {
    applyEdit((current, start, end) => {
      const selected = current.slice(start, end) || '';
      const insert = `${left}${selected || 'text'}${right}`;
      const next = current.slice(0, start) + insert + current.slice(end);
      const innerStart = start + left.length;
      const innerEnd = innerStart + (selected ? selected.length : 'text'.length);
      return { next, nextSelectionStart: innerStart, nextSelectionEnd: innerEnd };
    });
  };

  const insertSnippet = (snippet: string, cursorOffsetFromEnd = 0) => {
    applyEdit((current, start, end) => {
      const next = current.slice(0, start) + snippet + current.slice(end);
      const cursor = start + snippet.length + cursorOffsetFromEnd;
      return { next, nextSelectionStart: cursor, nextSelectionEnd: cursor };
    });
  };

  const makeHeading = (level: number) => {
    const prefix = `${'#'.repeat(Math.min(6, Math.max(1, level)))} `;
    applyEdit((current, start, end) => {
      const selected = current.slice(start, end) || '';
      const lines = (selected || '').split('\n');
      const nextSelected =
        lines.length === 1 && !selected
          ? `${prefix}Heading`
          : lines
              .map((l) => (l.trim().length ? `${prefix}${l.replace(/^#+\s+/, '')}` : l))
              .join('\n');
      const next = current.slice(0, start) + nextSelected + current.slice(end);
      return {
        next,
        nextSelectionStart: start,
        nextSelectionEnd: start + nextSelected.length,
      };
    });
  };

  const insertLink = () => {
    applyEdit((current, start, end) => {
      const selected = current.slice(start, end) || '';
      const text = selected || 'link text';
      const snippet = `[${text}](https://example.com)`;
      const next = current.slice(0, start) + snippet + current.slice(end);
      // Select URL so it's easy to replace.
      const urlStart = start + 2 + text.length + 2; // "[text]("
      const urlEnd = urlStart + 'https://example.com'.length;
      return { next, nextSelectionStart: urlStart, nextSelectionEnd: urlEnd };
    });
  };

  const insertImageTemplate = (url?: string) => {
    const u = url || 'https://.../image.png';
    applyEdit((current, start, end) => {
      const snippet = `![Caption](${u})\n`;
      const next = current.slice(0, start) + snippet + current.slice(end);
      const captionStart = start + 2; // after ![
      const captionEnd = captionStart + 'Caption'.length;
      return { next, nextSelectionStart: captionStart, nextSelectionEnd: captionEnd };
    });
  };

  const insertTableTemplate = () => {
    insertSnippet(
      [
        '| Column 1 | Column 2 |',
        '| --- | --- |',
        '| Value 1 | Value 2 |',
        '^ Table caption (optional)',
        '',
      ].join('\n')
    );
  };

  return (
    <div className={`space-y-3 ${fill ? 'h-full flex flex-col min-h-0' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => wrapSelection('**')}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_')}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => makeHeading(2)}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertLink()}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => insertImageTemplate()}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => insertTableTemplate()}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('\n> Quote\n')}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Quote
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('\n- Item 1\n- Item 2\n')}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Bullets
        </button>
        <button
          type="button"
          onClick={() => insertSnippet('\n1. Step one\n2. Step two\n')}
          className="px-3 py-1.5 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 text-iki-white text-xs"
        >
          Numbered
        </button>
        <button
          type="button"
          onClick={() => setView('write')}
          className={`ml-auto px-3 py-1.5 rounded-lg border text-iki-white text-xs transition-colors ${
            view === 'write'
              ? 'bg-light-green/20 border-light-green/30 text-light-green'
              : 'bg-black/30 hover:bg-black/40 border-light-green/10'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setView('preview')}
          className={`px-3 py-1.5 rounded-lg border text-iki-white text-xs transition-colors ${
            view === 'preview'
              ? 'bg-light-green/20 border-light-green/30 text-light-green'
              : 'bg-black/30 hover:bg-black/40 border-light-green/10'
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setView('split')}
          className={`px-3 py-1.5 rounded-lg border text-iki-white text-xs transition-colors ${
            view === 'split'
              ? 'bg-light-green/20 border-light-green/30 text-light-green'
              : 'bg-black/30 hover:bg-black/40 border-light-green/10'
          }`}
        >
          Split
        </button>
        <div className="ml-2 text-xs text-iki-white/50 whitespace-nowrap">
          {words} words · {formatReadingTime(words)}
        </div>
      </div>

      {/* Inline image upload helper */}
      <details className="rounded-xl bg-iki-grey/20 border border-light-green/10 p-3" open={!fill}>
        <summary className="cursor-pointer select-none text-xs text-iki-white/80">
          Insert images & captions
        </summary>
        <div className="text-xs text-iki-white/70 mt-2 mb-2">
          Tip: images render inline with captions. Use{' '}
          <span className="font-mono">![Caption](url)</span>. For captions under tables (and
          optional extra captions), add a line starting with <span className="font-mono">^ </span>{' '}
          after the image/table.
        </div>
        <ImageUpload
          label="Upload & insert image into markdown"
          folder={uploadFolder}
          currentUrl={''}
          onUploadComplete={(url) => insertImageTemplate(url)}
        />
      </details>

      <div className={`${fill ? 'flex-1 min-h-0' : ''}`}>
        <div
          className={`grid gap-4 ${view === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'} ${
            fill ? 'h-full min-h-0' : ''
          }`}
        >
          {view !== 'preview' && (
            <textarea
              id={id}
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={10}
              className={`w-full px-5 py-4 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white text-sm font-mono leading-6 focus:outline-none focus:border-light-green/50 ${
                fill ? 'h-full min-h-0 resize-none' : 'min-h-[420px] md:min-h-[520px] resize-y'
              }`}
              placeholder={placeholder}
            />
          )}

          {view !== 'write' && (
            <div
              className={`rounded-xl bg-iki-grey/20 border border-light-green/10 p-4 overflow-auto ${
                fill ? 'h-full min-h-0' : 'min-h-[420px] md:min-h-[520px]'
              }`}
            >
              <div className="text-xs text-iki-white/50 mb-3">Rendered preview</div>
              <MarkdownPreview value={value || ''} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Large admin UI component
export default function ExploreVideos() {
  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentDateId, setCurrentDateId] = useState(generateDateId());
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<ExploreDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyMode, setCopyMode] = useState<'single' | 'range'>('single');
  const [copyTargetDate, setCopyTargetDate] = useState('');
  const [copyStartDate, setCopyStartDate] = useState('');
  const [copyEndDate, setCopyEndDate] = useState('');
  const [showDateList, setShowDateList] = useState(false);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<{
    metrics: {
      likeCount: number;
      dislikeCount: number;
      commentCount: number;
      viewCount: number;
      totalEngagedMs: number;
      updatedAt?: string;
    } | null;
    history: Array<Record<string, unknown>>;
    comments: Array<Record<string, unknown>>;
  } | null>(null);

  // Create video form state
  const [videoForm, setVideoForm] = useState({
    title: '',
    media_type: 'video',
    media_url: '',
    img_url: '',
    thumbnail: '',
    media_text: '',
    media_desc: '',
    media_category: 'fitness',
    media_tags: '',
    priority: 0,
    dateId: generateDateId(),
  });

  const fetchVideos = async (dateId?: string, category?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateId) params.append('dateId', dateId);
      if (category) params.append('category', category);

      const response = await fetch(`/api/explore?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      setVideos(data.videos || []);
      if (data.dateId) setCurrentDateId(data.dateId);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to fetch content'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      setLoadingDates(true);
      const response = await fetch('/api/explore/dates');
      if (!response.ok) throw new Error('Failed to fetch dates');
      const data = await response.json();
      setAvailableDates(data.dates || []);
    } catch (err: unknown) {
      console.error('Error fetching dates:', err);
    } finally {
      setLoadingDates(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch functions are stable within this page
  useEffect(() => {
    fetchVideos(currentDateId, filterCategory || undefined);
    fetchAvailableDates();
  }, [currentDateId, filterCategory]);

  const fetchEngagement = async (contentId: string) => {
    try {
      setEngagementLoading(true);
      setEngagementError(null);
      const res = await fetch(`/api/explore/engagement?contentId=${encodeURIComponent(contentId)}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as unknown;
        const msg =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Failed to fetch engagement';
        throw new Error(msg);
      }
      const data = (await res.json().catch(() => null)) as unknown;
      const obj = isRecord(data) ? data : {};
      const metricsRaw = obj.metrics;
      const historyRaw = obj.history;
      const commentsRaw = obj.comments;

      const metrics = isRecord(metricsRaw)
        ? {
            likeCount: numberFromUnknown(metricsRaw.likeCount, 0),
            dislikeCount: numberFromUnknown(metricsRaw.dislikeCount, 0),
            commentCount: numberFromUnknown(metricsRaw.commentCount, 0),
            viewCount: numberFromUnknown(metricsRaw.viewCount, 0),
            totalEngagedMs: numberFromUnknown(metricsRaw.totalEngagedMs, 0),
            updatedAt: typeof metricsRaw.updatedAt === 'string' ? metricsRaw.updatedAt : undefined,
          }
        : null;

      const history = Array.isArray(historyRaw)
        ? historyRaw.filter(isRecord).map((x) => ({ ...x }))
        : [];
      const comments = Array.isArray(commentsRaw)
        ? commentsRaw.filter(isRecord).map((x) => ({ ...x }))
        : [];
      setEngagement({
        metrics,
        history,
        comments,
      });
    } catch (err: unknown) {
      setEngagement(null);
      setEngagementError(errorMessage(err, 'Failed to fetch engagement'));
    } finally {
      setEngagementLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: only depends on selected id
  useEffect(() => {
    if (!selectedVideo?.id) return;
    fetchEngagement(selectedVideo.id);
  }, [selectedVideo?.id]);

  const handleCreateVideo = async () => {
    const validationError = validateExploreForm(videoForm as ExploreContentForm);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setCreating(true);
      const tags = parseTags(videoForm.media_tags);

      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...videoForm,
          media_tags: tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create content');
      }

      // Reset form and close modal
      setVideoForm({
        title: '',
        media_type: 'video',
        media_url: '',
        img_url: '',
        thumbnail: '',
        media_text: '',
        media_desc: '',
        media_category: 'fitness',
        media_tags: '',
        priority: 0,
        dateId: generateDateId(),
      });
      setIsCreateOpen(false);

      // Refresh videos
      fetchVideos(videoForm.dateId || currentDateId, filterCategory || undefined);

      alert('Content created successfully!');
    } catch (err: unknown) {
      alert(`Failed to create content: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setCreating(false);
    }
  };

  // Edit flow
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<typeof videoForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const openEdit = (video: ExploreVideo) => {
    setEditId(video.id);
    setEditForm({
      title: video.title || '',
      media_type: video.media_type || 'video',
      media_url: video.media_url || '',
      img_url: video.img_url || '',
      thumbnail: video.thumbnail || video.img_url || '',
      media_text: video.media_text || '',
      media_desc: video.media_desc || '',
      media_category: video.media_category || 'fitness',
      media_tags: (video.media_tags || []).join(', '),
      priority:
        typeof video.priority === 'number' && Number.isFinite(video.priority) ? video.priority : 0,
      dateId: currentDateId,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editForm || !editId) return;
    const validationError = validateExploreForm(editForm as ExploreContentForm);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setEditing(true);
      const tags = parseTags(editForm.media_tags);

      const response = await fetch('/api/explore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: editId,
          ...editForm,
          dateId: currentDateId,
          media_tags: tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update content');
      }

      const data = await response.json();
      const updated = data.video as ExploreVideo;
      setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selectedVideo?.id === updated.id) setSelectedVideo(updated);

      setIsEditOpen(false);
      setEditForm(null);
      setEditId(null);
      alert('Updated successfully!');
    } catch (err: unknown) {
      alert(`Failed to update: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(videoId);
      const response = await fetch(`/api/explore?videoId=${videoId}&dateId=${currentDateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }

      setVideos(videos.filter((v) => v.id !== videoId));
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err: unknown) {
      const msg = errorMessage(err, 'Unknown error');
      setError(msg);
      alert(`Failed to delete item: ${msg}`);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'article':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const MediaThumb = ({
    src,
    title,
    mediaType,
  }: {
    src?: string;
    title: string;
    mediaType: string;
  }) => {
    const [failed, setFailed] = useState(false);
    const url = (src || '').trim();
    const showFallback = failed || !url;

    if (showFallback) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-iki-grey/30">
          <div className="flex flex-col items-center gap-2 text-iki-white/70">
            <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
              {getMediaTypeIcon(mediaType)}
            </div>
            <span className="text-xs capitalize">{mediaType}</span>
          </div>
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  };

  const handleCopyToDates = async (targetDateIds: string[]) => {
    if (targetDateIds.length === 0) {
      alert('Please select at least one target date');
      return;
    }

    if (
      !confirm(
        `Copy all ${videos.length} items from ${formatDateId(currentDateId)} to ${targetDateIds.length} date(s)?`
      )
    ) {
      return;
    }

    try {
      setCopying(true);
      const response = await fetch('/api/explore/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDateId: currentDateId,
          targetDateIds,
          copyLayouts: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy items');
      }

      const data = await response.json();
      setIsCopyOpen(false);
      setCopyTargetDate('');
      setCopyStartDate('');
      setCopyEndDate('');

      // Refresh dates list and current videos
      fetchAvailableDates();
      fetchVideos(currentDateId, filterCategory || undefined);

      alert(`Successfully copied to ${data.summary.successful} date(s)!`);
    } catch (err: unknown) {
      alert(`Failed to copy items: ${errorMessage(err, 'Unknown error')}`);
    } finally {
      setCopying(false);
    }
  };

  const handleQuickCopy = (days: number) => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(generateDateId(date));
    }
    handleCopyToDates(dates);
  };

  const handleCustomDateCopy = () => {
    if (!copyTargetDate) {
      alert('Please select a target date');
      return;
    }
    const dateId = copyTargetDate.replace(/-/g, '');
    handleCopyToDates([dateId]);
  };

  const handleDateRangeCopy = () => {
    if (!copyStartDate || !copyEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(copyStartDate);
    const end = new Date(copyEndDate);

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(generateDateId(current));
      current.setDate(current.getDate() + 1);
    }

    handleCopyToDates(dates);
  };

  const filteredVideos = videos.filter((video) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(query) ||
      video.media_desc.toLowerCase().includes(query) ||
      video.media_text.toLowerCase().includes(query) ||
      video.media_tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const exportContent = (format: 'csv' | 'json') => {
    const rows = filteredVideos.map((v) => ({
      id: v.id,
      created_at: v.created_at,
      priority: typeof v.priority === 'number' ? v.priority : 0,
      title: v.title,
      media_type: v.media_type,
      media_category: v.media_category,
      media_tags: (v.media_tags || []).join(','),
      media_url: v.media_url,
      thumbnail: v.thumbnail || v.img_url || '',
      media_desc: v.media_desc || '',
      dateId: currentDateId,
    }));

    const stamp = `${formatDateId(currentDateId)}-${new Date().toISOString().slice(0, 10)}`.replace(
      /[^0-9A-Za-z_-]/g,
      ''
    );
    if (format === 'json') return downloadJson(`explore-${stamp}.json`, rows);
    return downloadCsv(`explore-${stamp}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 border border-light-green/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="heading-md font-goldplay text-iki-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-light-green" />
              Explore Content
            </h2>
            <p className="body-sm text-iki-white/60 font-tsukimi mt-1">
              Create and manage Explore content (video, audio, articles)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportContent('csv')}
              disabled={filteredVideos.length === 0}
              className="px-4 py-2 rounded-full bg-iki-grey/30 text-iki-white border border-light-green/20 hover:bg-iki-grey/40 transition-colors flex items-center gap-2 body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => exportContent('json')}
              disabled={filteredVideos.length === 0}
              className="px-4 py-2 rounded-full bg-iki-grey/30 text-iki-white border border-light-green/20 hover:bg-iki-grey/40 transition-colors flex items-center gap-2 body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => setIsCopyOpen(true)}
              disabled={videos.length === 0}
              className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2 body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy to Dates
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-full bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors flex items-center gap-2 body-sm font-tsukimi"
            >
              <Plus className="w-4 h-4" />
              Add Content
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                const dateStr = formatDateId(currentDateId);
                const date = new Date(`${dateStr}T00:00:00`);
                date.setDate(date.getDate() - 1);
                setCurrentDateId(generateDateId(date));
              }}
              className="p-2 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-iki-white" />
            </button>
            <div className="flex-1">
              <input
                type="date"
                value={formatDateId(currentDateId)}
                onChange={(e) => {
                  const date = e.target.value;
                  if (date) {
                    const dateId = date.replace(/-/g, '');
                    setCurrentDateId(dateId);
                  }
                }}
                className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const dateStr = formatDateId(currentDateId);
                const date = new Date(`${dateStr}T00:00:00`);
                date.setDate(date.getDate() + 1);
                setCurrentDateId(generateDateId(date));
              }}
              className="p-2 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-iki-white" />
            </button>
            <button
              type="button"
              onClick={() => setShowDateList(!showDateList)}
              className="px-4 py-2 rounded-xl bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 transition-colors body-sm text-iki-white font-tsukimi"
            >
              {showDateList ? 'Hide' : 'Show'} Past Dates
            </button>
          </div>

          {showDateList && (
            <div className="mt-4 p-4 rounded-xl bg-iki-grey/20 border border-light-green/10 max-h-60 overflow-y-auto">
              {loadingDates ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-light-green mx-auto" />
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-iki-white/60 body-sm text-center py-4">No dates found</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableDates.map((date) => (
                    <button
                      type="button"
                      key={date.dateId}
                      onClick={() => {
                        setCurrentDateId(date.dateId);
                        setShowDateList(false);
                      }}
                      className={`p-3 rounded-lg border transition-colors text-left ${
                        currentDateId === date.dateId
                          ? 'bg-light-green/20 border-light-green/50 text-light-green'
                          : 'bg-iki-grey/30 border-light-green/10 text-iki-white hover:bg-iki-grey/40'
                      }`}
                    >
                      <div className="body-xs font-medium">{formatDateId(date.dateId)}</div>
                      <div className="body-xs text-iki-white/60 mt-1">{date.videoCount} items</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label
              htmlFor="explore-filter-category"
              className="block text-sm font-medium text-iki-white/80 mb-2"
            >
              Category
            </label>
            <select
              id="explore-filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
            >
              <option value="">All Categories</option>
              {MEDIA_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label
              htmlFor="explore-search"
              className="block text-sm font-medium text-iki-white/80 mb-2"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-iki-white/40" />
              <input
                id="explore-search"
                type="text"
                placeholder="Search content..."
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

      {/* Content List */}
      {loading ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-green mx-auto" />
          <p className="text-iki-white/60 body-sm font-tsukimi mt-4">Loading content...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <Compass className="w-16 h-16 text-iki-white/20 mx-auto mb-4" />
          <p className="text-iki-white/60 body-md font-tsukimi">
            No content found for {formatDateId(currentDateId)}
            {filterCategory && ` in ${filterCategory}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="glass rounded-2xl p-4 border border-light-green/10 hover:border-light-green/30 transition-all cursor-pointer"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-iki-grey/20">
                <MediaThumb
                  src={video.thumbnail || video.img_url}
                  title={video.title}
                  mediaType={video.media_type}
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  {getMediaTypeIcon(video.media_type)}
                  <span className="text-xs text-white capitalize">{video.media_type}</span>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="text-xs text-white capitalize">{video.media_category}</span>
                </div>
              </div>
              <h3 className="font-medium text-iki-white body-sm mb-1 line-clamp-2">
                {video.title}
              </h3>
              {video.media_desc && (
                <p className="text-iki-white/60 text-xs line-clamp-2 mb-2">{video.media_desc}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-iki-white/40">
                  <Calendar className="w-3 h-3" />
                  {formatDate(video.created_at)}
                </div>
                <div className="flex items-center gap-2 text-xs text-iki-white/40">
                  <span className="px-2 py-0.5 rounded-full bg-black/30 border border-light-green/10">
                    P:{typeof video.priority === 'number' ? video.priority : 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVideo(video);
                    }}
                    className="p-2 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 text-iki-white/80 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(video);
                    }}
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                    disabled={deleting === video.id}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === video.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Content Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`glass rounded-3xl p-6 border border-light-green/10 w-full ${
              videoForm.media_type === 'article'
                ? 'max-w-6xl h-[92vh] overflow-hidden flex flex-col'
                : 'max-w-2xl max-h-[90vh] overflow-y-auto'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Add New Content</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            {videoForm.media_type === 'article' ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 flex-1 min-h-0 overflow-hidden">
                  {/* Metadata */}
                  <div className="space-y-4 h-full overflow-y-auto pr-1">
                    <div>
                      <label
                        htmlFor="explore-create-title"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Title *
                      </label>
                      <input
                        id="explore-create-title"
                        type="text"
                        value={videoForm.title}
                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="Enter title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="explore-create-type"
                          className="block text-sm font-medium text-iki-white/80 mb-2"
                        >
                          Media Type *
                        </label>
                        <select
                          id="explore-create-type"
                          value={videoForm.media_type}
                          onChange={(e) =>
                            setVideoForm({ ...videoForm, media_type: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        >
                          {MEDIA_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="explore-create-category"
                          className="block text-sm font-medium text-iki-white/80 mb-2"
                        >
                          Category *
                        </label>
                        <select
                          id="explore-create-category"
                          value={videoForm.media_category}
                          onChange={(e) =>
                            setVideoForm({ ...videoForm, media_category: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        >
                          {MEDIA_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-priority"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Priority (higher shows first)
                      </label>
                      <input
                        id="explore-create-priority"
                        type="number"
                        value={videoForm.priority}
                        onChange={(e) =>
                          setVideoForm({
                            ...videoForm,
                            priority: Number.isFinite(e.target.valueAsNumber)
                              ? e.target.valueAsNumber
                              : 0,
                          })
                        }
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-url"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Article URL (optional)
                      </label>
                      <input
                        id="explore-create-url"
                        type="url"
                        value={videoForm.media_url}
                        onChange={(e) => setVideoForm({ ...videoForm, media_url: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="https://..."
                      />
                      <p className="text-iki-white/50 text-xs mt-2">
                        Provide either an article URL or write the markdown on the right.
                      </p>
                    </div>

                    <div>
                      <FileUpload
                        kind="document"
                        label="Or Upload PDF (optional)"
                        folder="explore/article"
                        accept="application/pdf"
                        maxSizeMb={50}
                        currentUrl={videoForm.media_url}
                        onUploadComplete={(url) => setVideoForm({ ...videoForm, media_url: url })}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-thumb"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Thumbnail Image URL
                      </label>
                      <input
                        id="explore-create-thumb"
                        type="url"
                        value={videoForm.thumbnail}
                        onChange={(e) =>
                          setVideoForm({
                            ...videoForm,
                            thumbnail: e.target.value,
                            img_url: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <ImageUpload
                        onUploadComplete={(url) =>
                          setVideoForm({ ...videoForm, thumbnail: url, img_url: url })
                        }
                        currentUrl={videoForm.thumbnail}
                        label="Or Upload Thumbnail Image"
                        folder="explore/thumbnails"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-desc"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Description
                      </label>
                      <textarea
                        id="explore-create-desc"
                        value={videoForm.media_desc}
                        onChange={(e) => setVideoForm({ ...videoForm, media_desc: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="Enter description"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-tags"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Tags (comma-separated)
                      </label>
                      <input
                        id="explore-create-tags"
                        type="text"
                        value={videoForm.media_tags}
                        onChange={(e) => setVideoForm({ ...videoForm, media_tags: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-create-date"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Date (YYYYMMDD format)
                      </label>
                      <input
                        id="explore-create-date"
                        type="date"
                        value={formatDateId(videoForm.dateId)}
                        onChange={(e) => {
                          const date = e.target.value;
                          if (date) {
                            setVideoForm({ ...videoForm, dateId: date.replace(/-/g, '') });
                          }
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <label
                        htmlFor="explore-create-text"
                        className="block text-sm font-medium text-iki-white/80"
                      >
                        Markdown (article content)
                      </label>
                      <div className="text-xs text-iki-white/50">
                        Saved to <span className="font-mono">media_text</span> as Markdown
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <MarkdownComposer
                        id="explore-create-text"
                        value={videoForm.media_text}
                        onChange={(media_text) => setVideoForm({ ...videoForm, media_text })}
                        uploadFolder="explore/article-inline-images"
                        fill
                        placeholder={[
                          '# Heading',
                          '',
                          'Write your article in **Markdown**.',
                          '',
                          'Inline image with caption:',
                          '![This is the caption](https://...)',
                          '',
                          'Table with caption:',
                          '| Col 1 | Col 2 |',
                          '| --- | --- |',
                          '| A | B |',
                          '^ This is the table caption',
                          '',
                        ].join('\\n')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-4 border-t border-light-green/10">
                  <button
                    type="button"
                    onClick={handleCreateVideo}
                    disabled={creating}
                    className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Content'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="explore-create-title"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Title *
                  </label>
                  <input
                    id="explore-create-title"
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="Enter title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="explore-create-type"
                      className="block text-sm font-medium text-iki-white/80 mb-2"
                    >
                      Media Type *
                    </label>
                    <select
                      id="explore-create-type"
                      value={videoForm.media_type}
                      onChange={(e) => setVideoForm({ ...videoForm, media_type: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    >
                      {MEDIA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="explore-create-category"
                      className="block text-sm font-medium text-iki-white/80 mb-2"
                    >
                      Category *
                    </label>
                    <select
                      id="explore-create-category"
                      value={videoForm.media_category}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, media_category: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    >
                      {MEDIA_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="explore-create-priority"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Priority (higher shows first)
                  </label>
                  <input
                    id="explore-create-priority"
                    type="number"
                    value={videoForm.priority}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        priority: Number.isFinite(e.target.valueAsNumber)
                          ? e.target.valueAsNumber
                          : 0,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-create-url"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    {videoForm.media_type === 'article'
                      ? 'Article URL (optional)'
                      : videoForm.media_type === 'audio'
                        ? 'Audio URL *'
                        : 'Video URL *'}
                  </label>
                  <input
                    id="explore-create-url"
                    type="url"
                    value={videoForm.media_url}
                    onChange={(e) => setVideoForm({ ...videoForm, media_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="https://..."
                  />
                  {videoForm.media_type === 'video' && (
                    <p className="text-iki-white/50 text-xs mt-2">
                      Tip: use a direct video file URL (e.g. <span className="font-mono">.mp4</span>
                      ). YouTube links are not supported.
                    </p>
                  )}
                  {videoForm.media_type === 'article' && (
                    <p className="text-iki-white/50 text-xs mt-2">
                      Provide either an article URL or paste the article text below.
                    </p>
                  )}
                </div>

                {(videoForm.media_type === 'video' || videoForm.media_type === 'audio') && (
                  <div>
                    <FileUpload
                      kind={videoForm.media_type === 'video' ? 'video' : 'audio'}
                      label={`Or Upload ${videoForm.media_type === 'video' ? 'Video' : 'Audio'} File`}
                      folder={`explore/${videoForm.media_type}`}
                      accept={videoForm.media_type === 'video' ? 'video/*' : 'audio/*'}
                      maxSizeMb={videoForm.media_type === 'video' ? 200 : 50}
                      currentUrl={videoForm.media_url}
                      onUploadComplete={(url) => setVideoForm({ ...videoForm, media_url: url })}
                    />
                  </div>
                )}

                {videoForm.media_type === 'article' && (
                  <div>
                    <FileUpload
                      kind="document"
                      label="Or Upload PDF (optional)"
                      folder="explore/article"
                      accept="application/pdf"
                      maxSizeMb={50}
                      currentUrl={videoForm.media_url}
                      onUploadComplete={(url) => setVideoForm({ ...videoForm, media_url: url })}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="explore-create-thumb"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Thumbnail Image URL
                  </label>
                  <input
                    id="explore-create-thumb"
                    type="url"
                    value={videoForm.thumbnail}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        thumbnail: e.target.value,
                        img_url: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <ImageUpload
                    onUploadComplete={(url) =>
                      setVideoForm({ ...videoForm, thumbnail: url, img_url: url })
                    }
                    currentUrl={videoForm.thumbnail}
                    label="Or Upload Thumbnail Image"
                    folder="explore/thumbnails"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-create-desc"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="explore-create-desc"
                    value={videoForm.media_desc}
                    onChange={(e) => setVideoForm({ ...videoForm, media_desc: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-create-text"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    {videoForm.media_type === 'article'
                      ? 'Markdown (article content)'
                      : 'Media Text'}
                  </label>
                  {videoForm.media_type === 'article' ? (
                    <MarkdownComposer
                      id="explore-create-text"
                      value={videoForm.media_text}
                      onChange={(media_text) => setVideoForm({ ...videoForm, media_text })}
                      uploadFolder="explore/article-inline-images"
                      placeholder={[
                        '# Heading',
                        '',
                        'Write your article in **Markdown**.',
                        '',
                        'Inline image with caption:',
                        '![This is the caption](https://...)',
                        '',
                        'Table with caption:',
                        '| Col 1 | Col 2 |',
                        '| --- | --- |',
                        '| A | B |',
                        '^ This is the table caption',
                        '',
                      ].join('\\n')}
                    />
                  ) : (
                    <textarea
                      id="explore-create-text"
                      value={videoForm.media_text}
                      onChange={(e) => setVideoForm({ ...videoForm, media_text: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      placeholder="Enter media text"
                    />
                  )}
                  {videoForm.media_type === 'article' && (
                    <p className="text-iki-white/50 text-xs mt-2">
                      This field is stored in <span className="font-mono">media_text</span> as
                      Markdown and rendered in Flutter with a Markdown reader.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="explore-create-tags"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    id="explore-create-tags"
                    type="text"
                    value={videoForm.media_tags}
                    onChange={(e) => setVideoForm({ ...videoForm, media_tags: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-create-date"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Date (YYYYMMDD format)
                  </label>
                  <input
                    id="explore-create-date"
                    type="date"
                    value={formatDateId(videoForm.dateId)}
                    onChange={(e) => {
                      const date = e.target.value;
                      if (date) {
                        setVideoForm({ ...videoForm, dateId: date.replace(/-/g, '') });
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCreateVideo}
                    disabled={creating}
                    className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Content'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`glass rounded-3xl p-6 border border-light-green/10 w-full max-h-[90vh] overflow-y-auto ${
              selectedVideo.media_type === 'article' ? 'max-w-5xl' : 'max-w-2xl'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Content Details</h3>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-iki-grey/20">
                <MediaThumb
                  src={selectedVideo.thumbnail || selectedVideo.img_url}
                  title={selectedVideo.title}
                  mediaType={selectedVideo.media_type}
                />
              </div>

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Title</h4>
                <p className="text-iki-white body-md">{selectedVideo.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Type</h4>
                  <p className="text-iki-white body-sm capitalize">{selectedVideo.media_type}</p>
                </div>
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Category</h4>
                  <p className="text-iki-white body-sm capitalize">
                    {selectedVideo.media_category}
                  </p>
                </div>
              </div>

              {selectedVideo.media_desc && (
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">Description</h4>
                  <p className="text-iki-white body-sm">{selectedVideo.media_desc}</p>
                </div>
              )}

              {selectedVideo.media_text && (
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-1">
                    {selectedVideo.media_type === 'article' ? 'Markdown' : 'Media Text'}
                  </h4>
                  {selectedVideo.media_type === 'article' ? (
                    <div className="rounded-xl bg-iki-grey/20 border border-light-green/10 p-4">
                      <div className="text-xs text-iki-white/50 mb-3">Rendered preview</div>
                      <MarkdownPreview value={selectedVideo.media_text} />
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs text-iki-white/60 hover:text-iki-white/80">
                          Show raw markdown
                        </summary>
                        <pre className="mt-3 whitespace-pre-wrap break-words text-iki-white/85 text-xs bg-black/30 border border-white/10 rounded-xl p-4">
                          {selectedVideo.media_text}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-iki-white body-sm bg-iki-grey/20 border border-light-green/10 rounded-xl p-4">
                      {selectedVideo.media_text}
                    </pre>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Media URL</h4>
                <a
                  href={selectedVideo.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-light-green body-sm hover:underline break-all"
                >
                  {selectedVideo.media_url}
                </a>
              </div>

              {selectedVideo.media_tags && selectedVideo.media_tags.length > 0 && (
                <div>
                  <h4 className="text-iki-white/60 body-sm mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideo.media_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-light-green/10 text-light-green border border-light-green/20 body-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Created At</h4>
                <p className="text-iki-white body-sm">{formatDate(selectedVideo.created_at)}</p>
              </div>

              <div>
                <h4 className="text-iki-white/60 body-sm mb-1">Priority</h4>
                <p className="text-iki-white body-sm">
                  {typeof selectedVideo.priority === 'number' ? selectedVideo.priority : 0}
                </p>
              </div>

              {/* Engagement (from app) */}
              <div className="rounded-2xl bg-iki-grey/20 border border-light-green/10 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-light-green" />
                    <h4 className="text-iki-white font-medium body-sm">Engagement</h4>
                    <span className="text-xs text-iki-white/50">(from Explore in-app usage)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchEngagement(selectedVideo.id)}
                    disabled={engagementLoading}
                    className="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/40 border border-white/10 text-iki-white text-xs disabled:opacity-50"
                  >
                    {engagementLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                {engagementError && (
                  <div className="mb-3 text-xs text-red-400">{engagementError}</div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-[11px] text-iki-white/50">Likes</div>
                    <div className="text-iki-white font-semibold">
                      {engagement?.metrics?.likeCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-[11px] text-iki-white/50">Dislikes</div>
                    <div className="text-iki-white font-semibold">
                      {engagement?.metrics?.dislikeCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-[11px] text-iki-white/50">Comments</div>
                    <div className="text-iki-white font-semibold">
                      {engagement?.metrics?.commentCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-[11px] text-iki-white/50">Views</div>
                    <div className="text-iki-white font-semibold">
                      {engagement?.metrics?.viewCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-[11px] text-iki-white/50">Engaged</div>
                    <div className="text-iki-white font-semibold">
                      {Math.round(((engagement?.metrics?.totalEngagedMs ?? 0) / 1000) * 10) / 10}s
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-xs text-iki-white/60 mb-2">Recent history</div>
                    {(engagement?.history?.length ?? 0) === 0 ? (
                      <div className="text-xs text-iki-white/40">No events yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-44 overflow-y-auto">
                        {(engagement?.history ?? []).slice(0, 12).map((evt, idx) => (
                          <div
                            key={typeof evt.id === 'string' ? evt.id : `evt-${idx}`}
                            className="text-xs text-iki-white/80 border-b border-white/5 pb-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-iki-white/70">
                                {stringFromUnknown(evt.eventType, 'event')}
                              </span>
                              <span className="text-iki-white/40">
                                {stringFromUnknown(evt.timestamp, '')}
                              </span>
                            </div>
                            <div className="text-iki-white/50 font-mono truncate">
                              {evt.userId != null ? `user:${String(evt.userId)}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-xs text-iki-white/60 mb-2">Recent comments</div>
                    {(engagement?.comments?.length ?? 0) === 0 ? (
                      <div className="text-xs text-iki-white/40">No comments yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-44 overflow-y-auto">
                        {(engagement?.comments ?? []).slice(0, 10).map((c, idx) => (
                          <div
                            key={typeof c.id === 'string' ? c.id : `c-${idx}`}
                            className="text-xs text-iki-white/80 border-b border-white/5 pb-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-iki-white/70">
                                {stringFromUnknown(c.username, 'Iki user')}
                              </span>
                              <span className="text-iki-white/40">
                                {stringFromUnknown(c.timestamp, '')}
                              </span>
                            </div>
                            <div className="text-iki-white/80 line-clamp-2">
                              {stringFromUnknown(c.comment, '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(selectedVideo)}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors body-sm font-tsukimi"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteVideo(selectedVideo.id);
                    setSelectedVideo(null);
                  }}
                  disabled={deleting === selectedVideo.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {deleting === selectedVideo.id ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`glass rounded-3xl p-6 border border-light-green/10 w-full ${
              editForm.media_type === 'article'
                ? 'max-w-6xl h-[92vh] overflow-hidden flex flex-col'
                : 'max-w-2xl max-h-[90vh] overflow-y-auto'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Edit Content</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditForm(null);
                  setEditId(null);
                }}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            {editForm.media_type === 'article' ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 flex-1 min-h-0 overflow-hidden">
                  {/* Metadata */}
                  <div className="space-y-4 h-full overflow-y-auto pr-1">
                    <div>
                      <label
                        htmlFor="explore-edit-title"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Title *
                      </label>
                      <input
                        id="explore-edit-title"
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="explore-edit-type"
                          className="block text-sm font-medium text-iki-white/80 mb-2"
                        >
                          Media Type *
                        </label>
                        <select
                          id="explore-edit-type"
                          value={editForm.media_type}
                          onChange={(e) => setEditForm({ ...editForm, media_type: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        >
                          {MEDIA_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="explore-edit-category"
                          className="block text-sm font-medium text-iki-white/80 mb-2"
                        >
                          Category *
                        </label>
                        <select
                          id="explore-edit-category"
                          value={editForm.media_category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, media_category: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        >
                          {MEDIA_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="explore-edit-priority"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Priority (higher shows first)
                      </label>
                      <input
                        id="explore-edit-priority"
                        type="number"
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            priority: Number.isFinite(e.target.valueAsNumber)
                              ? e.target.valueAsNumber
                              : 0,
                          })
                        }
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-edit-url"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Article URL (optional)
                      </label>
                      <input
                        id="explore-edit-url"
                        type="url"
                        value={editForm.media_url}
                        onChange={(e) => setEditForm({ ...editForm, media_url: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="https://..."
                      />
                      <p className="text-iki-white/50 text-xs mt-2">
                        Provide either an article URL or update the markdown on the right.
                      </p>
                    </div>

                    <div>
                      <FileUpload
                        kind="document"
                        label="Or Upload PDF (optional)"
                        folder="explore/article"
                        accept="application/pdf"
                        maxSizeMb={50}
                        currentUrl={editForm.media_url}
                        onUploadComplete={(url) => setEditForm({ ...editForm, media_url: url })}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-edit-thumb"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Thumbnail Image URL
                      </label>
                      <input
                        id="explore-edit-thumb"
                        type="url"
                        value={editForm.thumbnail}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            thumbnail: e.target.value,
                            img_url: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <ImageUpload
                        onUploadComplete={(url) =>
                          setEditForm({ ...editForm, thumbnail: url, img_url: url })
                        }
                        currentUrl={editForm.thumbnail}
                        label="Or Upload Thumbnail Image"
                        folder="explore/thumbnails"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-edit-desc"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Description
                      </label>
                      <textarea
                        id="explore-edit-desc"
                        value={editForm.media_desc}
                        onChange={(e) => setEditForm({ ...editForm, media_desc: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="explore-edit-tags"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Tags (comma-separated)
                      </label>
                      <input
                        id="explore-edit-tags"
                        type="text"
                        value={editForm.media_tags}
                        onChange={(e) => setEditForm({ ...editForm, media_tags: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="h-full min-h-0 overflow-hidden flex flex-col">
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <label
                        htmlFor="explore-edit-text"
                        className="block text-sm font-medium text-iki-white/80"
                      >
                        Markdown (article content)
                      </label>
                      <div className="text-xs text-iki-white/50">
                        Saved to <span className="font-mono">media_text</span> as Markdown
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <MarkdownComposer
                        id="explore-edit-text"
                        value={editForm.media_text}
                        onChange={(media_text) => setEditForm({ ...editForm, media_text })}
                        uploadFolder="explore/article-inline-images"
                        fill
                        placeholder={[
                          '# Heading',
                          '',
                          'Write your article in **Markdown**.',
                          '',
                          'Inline image with caption:',
                          '![This is the caption](https://...)',
                          '',
                          'Table with caption:',
                          '| Col 1 | Col 2 |',
                          '| --- | --- |',
                          '| A | B |',
                          '^ This is the table caption',
                          '',
                        ].join('\\n')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-4 border-t border-light-green/10">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={editing}
                    className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                  >
                    {editing ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditForm(null);
                      setEditId(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="explore-edit-title"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Title *
                  </label>
                  <input
                    id="explore-edit-title"
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="explore-edit-type"
                      className="block text-sm font-medium text-iki-white/80 mb-2"
                    >
                      Media Type *
                    </label>
                    <select
                      id="explore-edit-type"
                      value={editForm.media_type}
                      onChange={(e) => setEditForm({ ...editForm, media_type: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    >
                      {MEDIA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="explore-edit-category"
                      className="block text-sm font-medium text-iki-white/80 mb-2"
                    >
                      Category *
                    </label>
                    <select
                      id="explore-edit-category"
                      value={editForm.media_category}
                      onChange={(e) => setEditForm({ ...editForm, media_category: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    >
                      {MEDIA_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="explore-edit-priority"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Priority (higher shows first)
                  </label>
                  <input
                    id="explore-edit-priority"
                    type="number"
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priority: Number.isFinite(e.target.valueAsNumber)
                          ? e.target.valueAsNumber
                          : 0,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-edit-url"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    {editForm.media_type === 'article' ? 'Article URL (optional)' : 'Media URL *'}
                  </label>
                  <input
                    id="explore-edit-url"
                    type="url"
                    value={editForm.media_url}
                    onChange={(e) => setEditForm({ ...editForm, media_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="https://..."
                  />
                </div>

                {(editForm.media_type === 'video' || editForm.media_type === 'audio') && (
                  <div>
                    <FileUpload
                      kind={editForm.media_type === 'video' ? 'video' : 'audio'}
                      label={`Or Upload ${editForm.media_type === 'video' ? 'Video' : 'Audio'} File`}
                      folder={`explore/${editForm.media_type}`}
                      accept={editForm.media_type === 'video' ? 'video/*' : 'audio/*'}
                      maxSizeMb={editForm.media_type === 'video' ? 200 : 50}
                      currentUrl={editForm.media_url}
                      onUploadComplete={(url) => setEditForm({ ...editForm, media_url: url })}
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="explore-edit-thumb"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Thumbnail Image URL
                  </label>
                  <input
                    id="explore-edit-thumb"
                    type="url"
                    value={editForm.thumbnail}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        thumbnail: e.target.value,
                        img_url: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <ImageUpload
                    onUploadComplete={(url) =>
                      setEditForm({ ...editForm, thumbnail: url, img_url: url })
                    }
                    currentUrl={editForm.thumbnail}
                    label="Or Upload Thumbnail Image"
                    folder="explore/thumbnails"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-edit-desc"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="explore-edit-desc"
                    value={editForm.media_desc}
                    onChange={(e) => setEditForm({ ...editForm, media_desc: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="explore-edit-text"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    {editForm.media_type === 'article'
                      ? 'Markdown (article content)'
                      : 'Media Text'}
                  </label>
                  {editForm.media_type === 'article' ? (
                    <MarkdownComposer
                      id="explore-edit-text"
                      value={editForm.media_text}
                      onChange={(media_text) => setEditForm({ ...editForm, media_text })}
                      uploadFolder="explore/article-inline-images"
                      placeholder={[
                        '# Heading',
                        '',
                        'Write your article in **Markdown**.',
                        '',
                        'Inline image with caption:',
                        '![This is the caption](https://...)',
                        '',
                        'Table with caption:',
                        '| Col 1 | Col 2 |',
                        '| --- | --- |',
                        '| A | B |',
                        '^ This is the table caption',
                        '',
                      ].join('\\n')}
                    />
                  ) : (
                    <textarea
                      id="explore-edit-text"
                      value={editForm.media_text}
                      onChange={(e) => setEditForm({ ...editForm, media_text: e.target.value })}
                      rows={5}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    />
                  )}
                </div>

                <div>
                  <label
                    htmlFor="explore-edit-tags"
                    className="block text-sm font-medium text-iki-white/80 mb-2"
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    id="explore-edit-tags"
                    type="text"
                    value={editForm.media_tags}
                    onChange={(e) => setEditForm({ ...editForm, media_tags: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={editing}
                    className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                  >
                    {editing ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditForm(null);
                      setEditId(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy to Dates Modal */}
      {isCopyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Copy Explore Page</h3>
              <button
                type="button"
                onClick={() => setIsCopyOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-iki-grey/20 border border-light-green/10">
                <p className="text-iki-white/80 body-sm mb-2">
                  Copying from:{' '}
                  <span className="text-light-green font-medium">
                    {formatDateId(currentDateId)}
                  </span>
                </p>
                <p className="text-iki-white/60 body-xs">
                  {videos.length} video{videos.length !== 1 ? 's' : ''} will be copied
                </p>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-iki-white/80 body-sm font-medium mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickCopy(1)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCopy(3)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Next 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCopy(7)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Next 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickCopy(30)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Next 30 Days
                  </button>
                </div>
              </div>

              {/* Mode Toggle */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setCopyMode('single')}
                    className={`flex-1 px-4 py-2 rounded-xl transition-colors body-sm font-tsukimi ${
                      copyMode === 'single'
                        ? 'bg-light-green/20 text-light-green border border-light-green/30'
                        : 'bg-iki-grey/30 text-iki-white/60 border border-light-green/10'
                    }`}
                  >
                    Single Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyMode('range')}
                    className={`flex-1 px-4 py-2 rounded-xl transition-colors body-sm font-tsukimi ${
                      copyMode === 'range'
                        ? 'bg-light-green/20 text-light-green border border-light-green/30'
                        : 'bg-iki-grey/30 text-iki-white/60 border border-light-green/10'
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {copyMode === 'single' ? (
                  <div>
                    <label
                      htmlFor="explore-copy-target"
                      className="block text-sm font-medium text-iki-white/80 mb-2"
                    >
                      Target Date
                    </label>
                    <input
                      id="explore-copy-target"
                      type="date"
                      value={copyTargetDate}
                      onChange={(e) => setCopyTargetDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    />
                    <button
                      type="button"
                      onClick={handleCustomDateCopy}
                      disabled={copying || !copyTargetDate}
                      className="w-full mt-3 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                    >
                      {copying ? 'Copying...' : 'Copy to This Date'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="explore-copy-start"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        Start Date
                      </label>
                      <input
                        id="explore-copy-start"
                        type="date"
                        value={copyStartDate}
                        onChange={(e) => setCopyStartDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="explore-copy-end"
                        className="block text-sm font-medium text-iki-white/80 mb-2"
                      >
                        End Date
                      </label>
                      <input
                        id="explore-copy-end"
                        type="date"
                        value={copyEndDate}
                        onChange={(e) => setCopyEndDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDateRangeCopy}
                      disabled={copying || !copyStartDate || !copyEndDate}
                      className="w-full px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                    >
                      {copying ? 'Copying...' : 'Copy to Date Range'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-light-green/10">
                <button
                  type="button"
                  onClick={() => setIsCopyOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
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
