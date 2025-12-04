'use client';

import { useState } from 'react';
import { X, Mail, Phone, MapPin, Calendar, Activity, User as UserIcon, BarChart3 } from 'lucide-react';
import { User } from '@/lib/types';
import UserAnalyticsDashboard from './UserAnalyticsDashboard';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailModal({
  user,
  isOpen,
  onClose,
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');
  
  if (!isOpen || !user) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = () => {
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user.firstname) return user.firstname;
    if (user.username) return user.username;
    return 'Unknown User';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${activeTab === 'analytics' ? 'max-w-6xl' : 'max-w-3xl'} rounded-2xl bg-iki-grey border border-light-green/20 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 p-6 border-b border-light-green/20 bg-iki-grey z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-light-green to-[#a8d91a] bg-clip-text text-transparent">
                {getDisplayName()}
              </h2>
              <p className="text-sm text-iki-white/60 mt-1">
                {activeTab === 'details' ? 'Complete user information' : 'User analytics and insights'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-iki-grey/70 transition-colors"
            >
              <X className="w-5 h-5 text-iki-white/60" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'details'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'analytics'
                  ? 'bg-light-green/20 text-light-green border-2 border-light-green/50'
                  : 'bg-iki-grey/20 text-iki-white/70 border border-light-green/10 hover:bg-iki-grey/30'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'details' ? (
            <>
          {/* Profile Header */}
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-light-green to-[#a8d91a] flex items-center justify-center text-dark-blue font-black text-4xl shadow-xl">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={getDisplayName()}
                  className="w-24 h-24 rounded-2xl object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-iki-white mb-2">
                {getDisplayName()}
              </h3>
              {user.username && (
                <p className="text-iki-white/60 mb-4">@{user.username}</p>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.isOnline
                      ? 'bg-light-green/20 text-light-green border border-light-green/50'
                      : 'bg-iki-white/10 text-iki-white/60 border border-iki-white/20'
                  }`}
                >
                  {user.isOnline ? 'Online' : 'Offline'}
                </div>
                <div className="px-3 py-1 rounded-full bg-iki-grey/50 border border-light-green/20 text-xs font-semibold text-iki-white/80">
                  {user.points || 0} Points
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-light-green" />
                <span className="text-sm font-semibold text-iki-white/60">Email</span>
              </div>
              <p className="text-iki-white">{user.email || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-light-green" />
                <span className="text-sm font-semibold text-iki-white/60">Phone</span>
              </div>
              <p className="text-iki-white">{user.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Location & Personal Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-light-green" />
                <span className="text-sm font-semibold text-iki-white/60">Country</span>
              </div>
              <p className="text-iki-white">{user.country || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-light-green" />
                <span className="text-sm font-semibold text-iki-white/60">Birthday</span>
              </div>
              <p className="text-iki-white">{user.birthday || 'N/A'}</p>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Bio</span>
              <p className="text-iki-white">{user.bio}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Gender</span>
              <p className="text-iki-white">{user.gender || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Age</span>
              <p className="text-iki-white">{user.age || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Activity Level</span>
              <p className="text-iki-white">{user.activityLevel || 'N/A'}</p>
            </div>
          </div>

          {/* Health Stats */}
          {user.healthStats && user.healthStats.length > 0 && (
            <div className="p-4 rounded-xl bg-iki-grey/50 border border-light-green/20">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-light-green" />
                <span className="text-sm font-semibold text-iki-white/60">Health Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {user.healthStats.map((stat: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg bg-iki-grey border border-light-green/10">
                    <p className="text-xs text-iki-white/60 mb-1">{stat.name}</p>
                    <p className="text-lg font-bold text-light-green">{stat.value || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-light-green/20">
            <div>
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Signed Up</span>
              <p className="text-iki-white/80">{formatDate(user.signedUpAt)}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-iki-white/60 block mb-2">Last Seen</span>
              <p className="text-iki-white/80">{formatDate(user.lastSeen)}</p>
            </div>
          </div>

          {/* User ID */}
          <div className="p-4 rounded-xl bg-iki-grey/30 border border-light-green/10">
            <span className="text-xs font-mono text-iki-white/40">User ID: {user.id}</span>
          </div>
            </>
          ) : (
            <UserAnalyticsDashboard userId={user.id} />
          )}
        </div>
      </div>
    </div>
  );
}





