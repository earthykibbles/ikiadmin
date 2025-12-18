'use client';

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Trash2,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { downloadCsv, downloadJson } from '@/lib/export';
import { maskEmail, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';

interface Report {
  id: string;
  reportType: 'post' | 'story' | 'user';
  reporterId: string;
  reporterInfo: {
    id: string;
    username: string;
    email: string;
    photoUrl: string;
  } | null;
  postId?: string;
  storyId?: string;
  reportedUserId?: string;
  reportedPostInfo?: {
    id: string;
    description: string;
    mediaUrl: string;
    ownerId: string;
    username: string;
  } | null;
  reportedStoryInfo?: {
    id: string;
    caption: string;
    imageUrl: string;
    userId: string;
    username: string;
  } | null;
  reportedUserInfo?: {
    id: string;
    username: string;
    email: string;
    photoUrl: string;
  } | null;
  reason: string;
  additionalDetails: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string | null;
  updatedAt: string | null;
}

interface ReportCounts {
  total: number;
  posts: number;
  stories: number;
  users: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'stories' | 'users'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { privacyMode } = usePrivacyMode();
  const [counts, setCounts] = useState<ReportCounts>({
    total: 0,
    posts: 0,
    stories: 0,
    users: 0,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    dismissed: 0,
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
      setCounts(data.counts || counts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, statusFilter]);

  const updateReportStatus = async (reportId: string, newStatus: string, reportType: string) => {
    try {
      setUpdating(reportId);
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, reportType }),
      });

      if (!response.ok) throw new Error('Failed to update report status');

      await fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const deleteReport = async (reportId: string, reportType: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      setUpdating(reportId);
      const response = await fetch(`/api/reports/${reportId}?type=${reportType}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete report');

      await fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      spam: 'Spam',
      harassment: 'Harassment',
      inappropriate_content: 'Inappropriate Content',
      fake_account: 'Fake Account',
      other: 'Other',
    };
    return reasonMap[reason] || reason;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      case 'reviewed':
        return 'text-blue-500 bg-blue-500/20 border-blue-500/50';
      case 'resolved':
        return 'text-green-500 bg-green-500/20 border-green-500/50';
      case 'dismissed':
        return 'text-gray-500 bg-gray-500/20 border-gray-500/50';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
        return <FileText className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (privacyMode) {
      return (
        report.reporterId?.toLowerCase().includes(query) ||
        report.postId?.toLowerCase().includes(query) ||
        report.storyId?.toLowerCase().includes(query) ||
        report.reportedUserId?.toLowerCase().includes(query) ||
        report.reason?.toLowerCase().includes(query) ||
        report.additionalDetails?.toLowerCase().includes(query)
      );
    }
    return (
      report.reporterInfo?.username?.toLowerCase().includes(query) ||
      report.reportedPostInfo?.username?.toLowerCase().includes(query) ||
      report.reportedStoryInfo?.username?.toLowerCase().includes(query) ||
      report.reportedUserInfo?.username?.toLowerCase().includes(query) ||
      report.reason?.toLowerCase().includes(query) ||
      report.additionalDetails?.toLowerCase().includes(query)
    );
  });

  const exportReports = (format: 'csv' | 'json') => {
    const rows = filteredReports.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      status: r.status,
      reason: r.reason,
      reporterId: r.reporterId,
      reporterUsername: privacyMode ? '' : r.reporterInfo?.username || '',
      reporterEmail: privacyMode ? maskEmail(r.reporterInfo?.email) : r.reporterInfo?.email || '',
      postId: r.postId || '',
      storyId: r.storyId || '',
      reportedUserId: r.reportedUserId || '',
      reportedUsername:
        privacyMode ? '' : r.reportedUserInfo?.username || r.reportedPostInfo?.username || r.reportedStoryInfo?.username || '',
      createdAt: r.createdAt || '',
      updatedAt: r.updatedAt || '',
      additionalDetails: r.additionalDetails || '',
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') return downloadJson(`reports-${stamp}.json`, rows);
    return downloadCsv(`reports-${stamp}.csv`, rows);
  };

  return (
    <div className="spacing-section">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="section-title">Reports</h2>
            <p className="section-subtitle">Manage and review user reports</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportReports('csv')} className="btn-secondary">
              Export CSV
            </button>
            <button onClick={() => exportReports('json')} className="btn-secondary">
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-metrics">
        <div className="card-compact">
          <div className="flex items-center justify-between">
            <div>
              <p className="body-sm text-iki-white/60">Total Reports</p>
              <p className="heading-md text-iki-white mt-1">{counts.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-light-green" />
          </div>
        </div>
        <div className="card-compact">
          <div className="flex items-center justify-between">
            <div>
              <p className="body-sm text-iki-white/60">Pending</p>
              <p className="heading-md text-yellow-500 mt-1">{counts.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card-compact">
          <div className="flex items-center justify-between">
            <div>
              <p className="body-sm text-iki-white/60">Resolved</p>
              <p className="heading-md text-green-500 mt-1">{counts.resolved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="card-compact">
          <div className="flex items-center justify-between">
            <div>
              <p className="body-sm text-iki-white/60">Dismissed</p>
              <p className="heading-md text-gray-500 mt-1">{counts.dismissed}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-compact">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-iki-white/60" />
            <input
              type="text"
              placeholder={privacyMode ? 'Search by IDs, reason, details...' : 'Search reports...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-standard pl-10"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg body-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-lg body-sm font-medium transition-all ${
                activeTab === 'posts'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              Posts ({counts.posts})
            </button>
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-4 py-2 rounded-lg body-sm font-medium transition-all ${
                activeTab === 'stories'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              Stories ({counts.stories})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg body-sm font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              Users ({counts.users})
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-standard"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card-compact status-error">
          <p className="body-md">{error}</p>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="card text-center py-8">
          <p className="body-md text-iki-white/60">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="card text-center py-8">
          <AlertTriangle className="w-12 h-12 text-iki-white/40 mx-auto mb-4" />
          <p className="body-md text-iki-white/60">No reports found</p>
        </div>
      ) : (
        <div className="spacing-card">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="card-compact card-interactive"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span
                      className={`badge flex items-center gap-1 ${getStatusColor(report.status)}`}
                    >
                      {getStatusIcon(report.status)}
                      {report.status}
                    </span>
                    <span className="badge-primary">{report.reportType}</span>
                    <span className="badge status-info">{getReasonLabel(report.reason)}</span>
                  </div>

                  <div className="mt-2 spacing-card">
                    <div className="flex items-center gap-2 body-sm">
                      <UserIcon className="w-4 h-4 text-iki-white/60" />
                      <span className="text-iki-white/80">
                        Reported by:{' '}
                        <span className="font-medium">
                          {privacyMode
                            ? `id:${shortId(report.reporterId)}`
                            : report.reporterInfo?.username || report.reporterId}
                        </span>
                      </span>
                    </div>

                    {report.reportType === 'post' && report.reportedPostInfo && (
                      <div className="flex items-center gap-2 body-sm">
                        <MessageSquare className="w-4 h-4 text-iki-white/60" />
                        <span className="text-iki-white/80">
                          Post by:{' '}
                          <span className="font-medium">
                            {privacyMode
                              ? report.postId || 'N/A'
                              : report.reportedPostInfo.username || report.postId}
                          </span>
                        </span>
                      </div>
                    )}

                    {report.reportType === 'story' && report.reportedStoryInfo && (
                      <div className="flex items-center gap-2 body-sm">
                        <ImageIcon className="w-4 h-4 text-iki-white/60" />
                        <span className="text-iki-white/80">
                          Story by:{' '}
                          <span className="font-medium">
                            {privacyMode
                              ? report.storyId || 'N/A'
                              : report.reportedStoryInfo.username || report.storyId}
                          </span>
                        </span>
                      </div>
                    )}

                    {report.reportType === 'user' && report.reportedUserInfo && (
                      <div className="flex items-center gap-2 body-sm">
                        <UserIcon className="w-4 h-4 text-iki-white/60" />
                        <span className="text-iki-white/80">
                          User:{' '}
                          <span className="font-medium">
                            {privacyMode
                              ? `id:${shortId(report.reportedUserId)}`
                              : report.reportedUserInfo.username || report.reportedUserId}
                          </span>
                        </span>
                      </div>
                    )}

                    {report.additionalDetails && (
                      <p className="body-sm text-iki-white/60 mt-2 line-clamp-2">
                        {report.additionalDetails}
                      </p>
                    )}

                    <div className="flex items-center gap-2 body-sm text-iki-white/50 mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>Created: {formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                    className="p-2 hover:bg-iki-grey/30 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <FileText className="w-4 h-4 text-iki-white/60" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md text-iki-white">Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="btn-ghost"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="spacing-card">
              {/* Status and Type */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`badge flex items-center gap-1 ${getStatusColor(selectedReport.status)}`}
                >
                  {getStatusIcon(selectedReport.status)}
                  {selectedReport.status}
                </span>
                <span className="badge-primary">{selectedReport.reportType}</span>
                <span className="badge status-info">{getReasonLabel(selectedReport.reason)}</span>
              </div>

              {/* Reporter Info */}
              <div className="card-compact">
                <h4 className="body-md font-medium text-iki-white mb-2">Reporter</h4>
                <div className="spacing-card body-sm">
                  <p className="text-iki-white/80">
                    <span className="text-iki-white/60">Username:</span>{' '}
                    {privacyMode ? '[Hidden]' : selectedReport.reporterInfo?.username || 'N/A'}
                  </p>
                  <p className="text-iki-white/80">
                    <span className="text-iki-white/60">Email:</span>{' '}
                    {selectedReport.reporterInfo?.email
                      ? privacyMode
                        ? maskEmail(selectedReport.reporterInfo.email)
                        : selectedReport.reporterInfo.email
                      : 'N/A'}
                  </p>
                  <p className="text-iki-white/80">
                    <span className="text-iki-white/60">ID:</span> {selectedReport.reporterId}
                  </p>
                </div>
              </div>

              {/* Reported Content/User Info */}
              {selectedReport.reportType === 'post' && selectedReport.reportedPostInfo && (
                <div className="card-compact">
                  <h4 className="body-md font-medium text-iki-white mb-2">Reported Post</h4>
                  <div className="spacing-card body-sm">
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Post ID:</span> {selectedReport.postId}
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Owner:</span>{' '}
                      {selectedReport.reportedPostInfo.username} ({selectedReport.reportedPostInfo.ownerId})
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Description:</span>{' '}
                      {selectedReport.reportedPostInfo.description || 'No description'}
                    </p>
                    {selectedReport.reportedPostInfo.mediaUrl && (
                      <div className="mt-2">
                        <img
                          src={selectedReport.reportedPostInfo.mediaUrl}
                          alt="Reported post"
                          className="max-w-full h-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedReport.reportType === 'story' && selectedReport.reportedStoryInfo && (
                <div className="card-compact">
                  <h4 className="body-md font-medium text-iki-white mb-2">Reported Story</h4>
                  <div className="spacing-card body-sm">
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Story ID:</span> {selectedReport.storyId}
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Owner:</span>{' '}
                      {selectedReport.reportedStoryInfo.username} ({selectedReport.reportedStoryInfo.userId})
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Caption:</span>{' '}
                      {selectedReport.reportedStoryInfo.caption || 'No caption'}
                    </p>
                    {selectedReport.reportedStoryInfo.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={selectedReport.reportedStoryInfo.imageUrl}
                          alt="Reported story"
                          className="max-w-full h-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedReport.reportType === 'user' && selectedReport.reportedUserInfo && (
                <div className="card-compact">
                  <h4 className="body-md font-medium text-iki-white mb-2">Reported User</h4>
                  <div className="spacing-card body-sm">
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Username:</span>{' '}
                      {privacyMode ? '[Hidden]' : selectedReport.reportedUserInfo.username || 'N/A'}
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Email:</span>{' '}
                      {selectedReport.reportedUserInfo.email
                        ? privacyMode
                          ? maskEmail(selectedReport.reportedUserInfo.email)
                          : selectedReport.reportedUserInfo.email
                        : 'N/A'}
                    </p>
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">ID:</span> {selectedReport.reportedUserId}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {selectedReport.additionalDetails && (
                <div className="card-compact">
                  <h4 className="body-md font-medium text-iki-white mb-2">Additional Details</h4>
                  <p className="text-iki-white/80 body-sm whitespace-pre-wrap">
                    {selectedReport.additionalDetails}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="card-compact">
                <div className="spacing-card body-sm">
                  <p className="text-iki-white/80">
                    <span className="text-iki-white/60">Created:</span> {formatDate(selectedReport.createdAt)}
                  </p>
                  {selectedReport.updatedAt && (
                    <p className="text-iki-white/80">
                      <span className="text-iki-white/60">Updated:</span> {formatDate(selectedReport.updatedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-light-green/10">
                <select
                  value={selectedReport.status}
                  onChange={(e) =>
                    updateReportStatus(selectedReport.id, e.target.value, selectedReport.reportType)
                  }
                  disabled={updating === selectedReport.id}
                  className="input-standard flex-1 disabled:opacity-50"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <button
                  onClick={() => deleteReport(selectedReport.id, selectedReport.reportType)}
                  disabled={updating === selectedReport.id}
                  className="btn-secondary status-error disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







