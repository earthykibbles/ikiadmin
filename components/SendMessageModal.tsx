'use client';

import { User } from '@/lib/types';
import { getUserAvatarSeed, getUserLabel, getUserSecondaryLabel, shortId } from '@/lib/privacy';
import { usePrivacyMode } from '@/lib/usePrivacyMode';
import { AlertCircle, Send, X } from 'lucide-react';
import { useState } from 'react';
import Avatar from './Avatar';

interface SendMessageModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (title: string, body: string, data?: any) => Promise<void>;
}

export default function SendMessageModal({ user, isOpen, onClose, onSend }: SendMessageModalProps) {
  const { privacyMode } = usePrivacyMode();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [customData, setCustomData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !user) return null;
  const label = getUserLabel(user, privacyMode);
  const secondary =
    getUserSecondaryLabel(user, privacyMode) || (privacyMode ? `id:${shortId(user.id)}` : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim() || !body.trim()) {
      setError('Title and message are required');
      return;
    }

    setLoading(true);
    try {
      let data = {};
      if (customData.trim()) {
        try {
          data = JSON.parse(customData);
        } catch {
          setError('Invalid JSON in custom data');
          setLoading(false);
          return;
        }
      }

      await onSend(title, body, data);
      setSuccess(true);
      setTimeout(() => {
        setTitle('');
        setBody('');
        setCustomData('');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-iki-grey border border-light-green/20 shadow-2xl z-10">
        <div className="p-6 border-b border-light-green/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-light-green to-[#a8d91a] bg-clip-text text-transparent">
                Send FCM Message
              </h2>
              <p className="text-sm text-iki-white/60 mt-1">
                Send a push notification to {label}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-iki-grey/70 transition-colors"
            >
              <X className="w-5 h-5 text-iki-white/60" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-iki-grey/40 border border-light-green/20 flex items-center justify-center">
              <Avatar
                src={user.photoUrl}
                seed={getUserAvatarSeed(user)}
                alt={label}
                size={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-iki-white truncate">{label}</div>
              {privacyMode ? (
                secondary ? (
                  <div className="text-[11px] text-iki-white/50 font-mono truncate">{secondary}</div>
                ) : null
              ) : (
                <div className="text-[11px] text-iki-white/50 font-mono truncate">
                  {String(user.id || '')}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-light-green/20 border border-light-green/50">
              <p className="text-sm text-light-green">Message sent successfully!</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-iki-white/80 mb-2">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-iki-white/80 mb-2">
              Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter message content"
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-iki-white/80 mb-2">
              Custom Data (JSON, optional)
            </label>
            <textarea
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder='{"key": "value"}'
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50 resize-none font-mono text-sm"
            />
            <p className="text-xs text-iki-white/40 mt-1">
              Optional JSON data to include with the notification
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-light-green to-[#a8d91a] text-dark-blue font-semibold hover:shadow-lg hover:shadow-light-green/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-blue border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white/80 font-semibold hover:bg-iki-grey/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
