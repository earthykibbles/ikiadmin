'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Plus, X, Video, Music, FileText, Calendar, Tag, Eye, Compass, Filter, Copy, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import ImageUpload from './ImageUpload';

interface ExploreVideo {
  id: string;
  created_at: string;
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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      console.error('Error fetching dates:', err);
    } finally {
      setLoadingDates(false);
    }
  };

  useEffect(() => {
    fetchVideos(currentDateId, filterCategory || undefined);
    fetchAvailableDates();
  }, [currentDateId, filterCategory]);

  const handleCreateVideo = async () => {
    if (!videoForm.title || !videoForm.media_url || !videoForm.media_category) {
      alert('Please fill in all required fields (title, media URL, category)');
      return;
    }

    try {
      setCreating(true);
      const tags = videoForm.media_tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

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
        throw new Error(error.error || 'Failed to create video');
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
        dateId: generateDateId(),
      });
      setIsCreateOpen(false);
      
      // Refresh videos
      fetchVideos(videoForm.dateId || currentDateId, filterCategory || undefined);
      
      alert('Video created successfully!');
    } catch (err: any) {
      alert(`Failed to create video: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(videoId);
      const response = await fetch(`/api/explore?videoId=${videoId}&dateId=${currentDateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete video');
      }
      
      setVideos(videos.filter(v => v.id !== videoId));
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`Failed to delete video: ${err.message}`);
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

  const handleCopyToDates = async (targetDateIds: string[]) => {
    if (targetDateIds.length === 0) {
      alert('Please select at least one target date');
      return;
    }

    if (!confirm(`Copy all ${videos.length} videos from ${formatDateId(currentDateId)} to ${targetDateIds.length} date(s)?`)) {
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
        throw new Error(error.error || 'Failed to copy videos');
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
    } catch (err: any) {
      alert(`Failed to copy videos: ${err.message}`);
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

  const filteredVideos = videos.filter(video => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title.toLowerCase().includes(query) ||
      video.media_desc.toLowerCase().includes(query) ||
      video.media_text.toLowerCase().includes(query) ||
      video.media_tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 border border-light-green/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="heading-md font-goldplay text-iki-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-light-green" />
              Explore Videos
            </h2>
            <p className="body-sm text-iki-white/60 font-tsukimi mt-1">
              Manage explore landing page videos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCopyOpen(true)}
              disabled={videos.length === 0}
              className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2 body-sm font-tsukimi disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4" />
              Copy to Dates
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-full bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors flex items-center gap-2 body-sm font-tsukimi"
            >
              <Plus className="w-4 h-4" />
              Add Video
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                const dateStr = formatDateId(currentDateId);
                const date = new Date(dateStr + 'T00:00:00');
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
              onClick={() => {
                const dateStr = formatDateId(currentDateId);
                const date = new Date(dateStr + 'T00:00:00');
                date.setDate(date.getDate() + 1);
                setCurrentDateId(generateDateId(date));
              }}
              className="p-2 rounded-lg bg-iki-grey/30 hover:bg-iki-grey/40 border border-light-green/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-iki-white" />
            </button>
            <button
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-light-green mx-auto"></div>
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-iki-white/60 body-sm text-center py-4">No dates found</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableDates.map((date) => (
                    <button
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
                      <div className="body-xs text-iki-white/60 mt-1">{date.videoCount} videos</div>
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
            <label className="block text-sm font-medium text-iki-white/80 mb-2">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
            >
              <option value="">All Categories</option>
              {MEDIA_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-iki-white/80 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-iki-white/40" />
              <input
                type="text"
                placeholder="Search videos..."
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

      {/* Videos List */}
      {loading ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-green mx-auto"></div>
          <p className="text-iki-white/60 body-sm font-tsukimi mt-4">Loading videos...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="glass rounded-3xl p-12 border border-light-green/10 text-center">
          <Compass className="w-16 h-16 text-iki-white/20 mx-auto mb-4" />
          <p className="text-iki-white/60 body-md font-tsukimi">
            No videos found for {formatDateId(currentDateId)}
            {filterCategory && ` in ${filterCategory}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="glass rounded-2xl p-4 border border-light-green/10 hover:border-light-green/30 transition-all cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-iki-grey/20">
                {video.thumbnail || video.img_url ? (
                  <img
                    src={video.thumbnail || video.img_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getMediaTypeIcon(video.media_type)}
                  </div>
                )}
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
                <p className="text-iki-white/60 text-xs line-clamp-2 mb-2">
                  {video.media_desc}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-iki-white/40">
                  <Calendar className="w-3 h-3" />
                  {formatDate(video.created_at)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVideo(video.id);
                  }}
                  disabled={deleting === video.id}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting === video.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Video Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Add New Video</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter video title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iki-white/80 mb-2">
                    Media Type *
                  </label>
                  <select
                    value={videoForm.media_type}
                    onChange={(e) => setVideoForm({ ...videoForm, media_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    {MEDIA_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-iki-white/80 mb-2">
                    Category *
                  </label>
                  <select
                    value={videoForm.media_category}
                    onChange={(e) => setVideoForm({ ...videoForm, media_category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  >
                    {MEDIA_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Media URL *
                </label>
                <input
                  type="url"
                  value={videoForm.media_url}
                  onChange={(e) => setVideoForm({ ...videoForm, media_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={videoForm.thumbnail}
                  onChange={(e) => setVideoForm({ ...videoForm, thumbnail: e.target.value, img_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="https://..."
                />
              </div>

              <div>
                <ImageUpload
                  onUploadComplete={(url) => setVideoForm({ ...videoForm, thumbnail: url, img_url: url })}
                  currentUrl={videoForm.thumbnail}
                  label="Or Upload Thumbnail Image"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Description
                </label>
                <textarea
                  value={videoForm.media_desc}
                  onChange={(e) => setVideoForm({ ...videoForm, media_desc: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Media Text
                </label>
                <textarea
                  value={videoForm.media_text}
                  onChange={(e) => setVideoForm({ ...videoForm, media_text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="Enter media text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={videoForm.media_tags}
                  onChange={(e) => setVideoForm({ ...videoForm, media_tags: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Date (YYYYMMDD format)
                </label>
                <input
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
                  onClick={handleCreateVideo}
                  disabled={creating}
                  className="flex-1 px-4 py-3 rounded-xl bg-light-green/20 text-light-green border border-light-green/30 hover:bg-light-green/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Video'}
                </button>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-3 rounded-xl bg-iki-grey/30 text-iki-white/80 border border-light-green/10 hover:bg-iki-grey/40 transition-colors body-sm font-tsukimi"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Video Details</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedVideo.thumbnail || selectedVideo.img_url ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-iki-grey/20">
                  <img
                    src={selectedVideo.thumbnail || selectedVideo.img_url}
                    alt={selectedVideo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

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
                  <p className="text-iki-white body-sm capitalize">{selectedVideo.media_category}</p>
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
                  <h4 className="text-iki-white/60 body-sm mb-1">Media Text</h4>
                  <p className="text-iki-white body-sm">{selectedVideo.media_text}</p>
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
                    {selectedVideo.media_tags.map((tag, idx) => (
                      <span
                        key={idx}
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleDeleteVideo(selectedVideo.id);
                    setSelectedVideo(null);
                  }}
                  disabled={deleting === selectedVideo.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors body-sm font-tsukimi disabled:opacity-50"
                >
                  {deleting === selectedVideo.id ? 'Deleting...' : 'Delete Video'}
                </button>
                <button
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

      {/* Copy to Dates Modal */}
      {isCopyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 border border-light-green/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md font-goldplay text-iki-white">Copy Explore Page</h3>
              <button
                onClick={() => setIsCopyOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/30 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white/60" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-iki-grey/20 border border-light-green/10">
                <p className="text-iki-white/80 body-sm mb-2">
                  Copying from: <span className="text-light-green font-medium">{formatDateId(currentDateId)}</span>
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
                    onClick={() => handleQuickCopy(1)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleQuickCopy(3)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Next 3 Days
                  </button>
                  <button
                    onClick={() => handleQuickCopy(7)}
                    disabled={copying}
                    className="px-3 py-2 rounded-lg bg-light-green/10 text-light-green border border-light-green/20 hover:bg-light-green/20 transition-colors body-xs font-tsukimi disabled:opacity-50"
                  >
                    Next 7 Days
                  </button>
                  <button
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
                    <label className="block text-sm font-medium text-iki-white/80 mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={copyTargetDate}
                      onChange={(e) => setCopyTargetDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                    />
                    <button
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
                      <label className="block text-sm font-medium text-iki-white/80 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={copyStartDate}
                        onChange={(e) => setCopyStartDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-iki-white/80 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={copyEndDate}
                        onChange={(e) => setCopyEndDate(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-iki-grey/30 border border-light-green/10 text-iki-white body-sm font-tsukimi focus:outline-none focus:border-light-green/50"
                      />
                    </div>
                    <button
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

