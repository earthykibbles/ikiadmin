'use client';

import { User } from '@/lib/types';
import { AlertCircle, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, data: any) => Promise<void>;
}

export default function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    phone: '',
    country: '',
    bio: '',
    gender: '',
    birthday: '',
    age: '',
    activityLevel: '',
    bodyWeightKg: '',
    points: '',
    isOnline: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
        bio: user.bio || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        age: user.age?.toString() || '',
        activityLevel: user.activityLevel || '',
        bodyWeightKg: user.bodyWeightKg?.toString() || '',
        points: user.points?.toString() || '0',
        isOnline: user.isOnline || false,
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    setLoading(true);
    try {
      const updateData: any = {};

      if (formData.firstname !== user.firstname) updateData.firstname = formData.firstname;
      if (formData.lastname !== user.lastname) updateData.lastname = formData.lastname;
      if (formData.username !== user.username) updateData.username = formData.username;
      if (formData.email !== user.email) updateData.email = formData.email;
      if (formData.phone !== user.phone) updateData.phone = formData.phone;
      if (formData.country !== user.country) updateData.country = formData.country;
      if (formData.bio !== user.bio) updateData.bio = formData.bio;
      if (formData.gender !== user.gender) updateData.gender = formData.gender;
      if (formData.birthday !== user.birthday) updateData.birthday = formData.birthday;
      if (formData.age && Number.parseInt(formData.age) !== user.age)
        updateData.age = Number.parseInt(formData.age);
      if (formData.activityLevel !== user.activityLevel)
        updateData.activityLevel = formData.activityLevel;
      if (formData.bodyWeightKg && Number.parseFloat(formData.bodyWeightKg) !== user.bodyWeightKg) {
        updateData.bodyWeightKg = Number.parseFloat(formData.bodyWeightKg);
      }
      if (Number.parseInt(formData.points) !== user.points)
        updateData.points = Number.parseInt(formData.points);
      if (formData.isOnline !== user.isOnline) updateData.isOnline = formData.isOnline;

      await onSave(user.id, updateData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl bg-iki-grey border border-light-green/20 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-6 border-b border-light-green/20 bg-iki-grey z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-light-green to-[#a8d91a] bg-clip-text text-transparent">
                Edit User Profile
              </h2>
              <p className="text-sm text-iki-white/60 mt-1">Update user information</p>
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
          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-light-green/20 border border-light-green/50">
              <p className="text-sm text-light-green">User updated successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstname}
                onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastname}
                onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-iki-white/80 mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Gender</label>
              <input
                type="text"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Birthday</label>
              <input
                type="text"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">
                Activity Level
              </label>
              <input
                type="text"
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">
                Body Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bodyWeightKg}
                onChange={(e) => setFormData({ ...formData, bodyWeightKg: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-iki-white/80 mb-2">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:ring-2 focus:ring-light-green/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isOnline"
              checked={formData.isOnline}
              onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
              className="w-4 h-4 rounded bg-iki-grey/50 border-light-green/20 text-light-green focus:ring-light-green/50"
            />
            <label htmlFor="isOnline" className="text-sm font-semibold text-iki-white/80">
              User is Online
            </label>
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
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
