'use client';

import { AlertTriangle, Trash2, X } from 'lucide-react';
import { User } from '@/lib/types';

interface DeleteConfirmModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen || !user) return null;

  const getDisplayName = () => {
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user.firstname) return user.firstname;
    if (user.username) return user.username;
    return 'this user';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-iki-grey border border-red-500/50 shadow-2xl z-10">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-iki-white mb-2">
                Delete User
              </h2>
              <p className="text-sm text-iki-white/60 mb-4">
                Are you sure you want to delete <span className="font-semibold text-iki-white">{getDisplayName()}</span>? This action cannot be undone.
              </p>
              <p className="text-xs text-red-400/80 mb-6">
                This will permanently delete the user's profile, data, and all associated information from the platform.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-iki-grey/50 border border-light-green/20 text-iki-white/80 font-semibold hover:bg-iki-grey/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-iki-grey/70 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-iki-white/60" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





