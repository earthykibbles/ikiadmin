'use client';

import { User } from '@/lib/types';
import { Ban, CheckCircle2, Edit, MoreVertical, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface UserActionsMenuProps {
  user: User;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onSendMessage: (user: User) => void;
  onBan?: (user: User) => void;
  onUnban?: (user: User) => void;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowMessage?: boolean;
}

export default function UserActionsMenu({
  user,
  onView,
  onEdit,
  onDelete,
  onSendMessage,
  onBan,
  onUnban,
  allowEdit = true,
  allowDelete = true,
  allowMessage = true,
}: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-iki-grey/50 border border-light-green/20 hover:bg-light-green/20 hover:border-light-green/40 transition-all group"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-iki-grey border border-light-green/20 shadow-2xl z-20 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 mb-2 border-b border-light-green/10">
                <p className="text-xs font-semibold text-iki-white/40 uppercase tracking-wider">
                  Admin Actions
                </p>
              </div>
              {allowEdit && (
                <button
                  onClick={() => {
                    onEdit(user);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-iki-white/90 hover:bg-light-green/10 hover:text-light-green flex items-center gap-3 transition-all rounded-lg group"
                >
                  <Edit className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
                  <div>
                    <div className="font-semibold">Edit Profile</div>
                    <div className="text-xs text-iki-white/50">Modify user information</div>
                  </div>
                </button>
              )}

              {allowMessage && (
                <button
                  onClick={() => {
                    onSendMessage(user);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-iki-white/90 hover:bg-light-green/10 hover:text-light-green flex items-center gap-3 transition-all rounded-lg group"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <Send className="w-4 h-4 text-iki-white/60 group-hover:text-light-green transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold">Send Message</div>
                    <div className="text-xs text-iki-white/50">Push notification</div>
                  </div>
                </button>
              )}
              {onBan && (
                <button
                  onClick={() => {
                    onBan(user);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-iki-white/90 hover:bg-yellow-500/10 hover:text-yellow-400 flex items-center gap-3 transition-all rounded-lg group"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold">Ban User</div>
                    <div className="text-xs text-iki-white/50">Restrict user access</div>
                  </div>
                </button>
              )}
              {onUnban && (
                <button
                  onClick={() => {
                    onUnban(user);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-iki-white/90 hover:bg-light-green/10 hover:text-light-green flex items-center gap-3 transition-all rounded-lg group"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-light-green group-hover:text-light-green transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold">Unban User</div>
                    <div className="text-xs text-iki-white/50">Restore user access</div>
                  </div>
                </button>
              )}
              <div className="border-t border-light-green/10 my-2" />
              {allowDelete && (
                <button
                  onClick={() => {
                    onDelete(user);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-3 transition-all rounded-lg group"
                >
                  <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                  <div>
                    <div className="font-semibold">Delete User</div>
                    <div className="text-xs text-red-400/60">Permanently remove user</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
