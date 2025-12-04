'use client';

import { useState, useEffect } from 'react';
import { Search, MessageSquare, Trash2, User as UserIcon, Calendar, MapPin, Heart, Eye, ArrowLeft, X, Image as ImageIcon, Plus, BookOpen, Clock } from 'lucide-react';
import ImageUpload from './ImageUpload';

interface Post {
  id: string;
  postId: string;
  ownerId: string;
  username: string;
  description: string;
  mediaUrl: string;
  location?: string;
  timestamp: string | null;
  likes: { [key: string]: boolean };
  likesCount: number;
}

interface Story {
  id: string;
  storyId: string;
  userId: string;
  username: string;
  userDp: string;
  imageUrl: string;
  caption: string;
  timestamp: string | null;
  expiresAt: string | null;
  viewers: string[];
  whoCanSee: string[];
}

interface User {
  id: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
}

export default function ConnectPosts() {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStories, setLoadingStories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [lastStoryDocId, setLastStoryDocId] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create Post form state
  const [postForm, setPostForm] = useState({
    ownerId: '',
    mediaUrl: '',
    description: '',
    location: '',
  });
  
  // Create Story form state
  const [storyForm, setStoryForm] = useState({
    userId: '',
    imageUrl: '',
    caption: '',
    whoCanSee: [] as string[],
  });

  const fetchPosts = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (!reset && lastDocId) {
        params.append('lastDocId', lastDocId);
      }
      
      const response = await fetch(`/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      
      if (reset) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      
      setHasMore(data.hasMore);
      setLastDocId(data.lastDocId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async (reset = false) => {
    try {
      setLoadingStories(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (!reset && lastStoryDocId) {
        params.append('lastDocId', lastStoryDocId);
      }
      
      const response = await fetch(`/api/stories?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stories');
      
      const data = await response.json();
      
      if (reset) {
        setStories(data.stories);
      } else {
        setStories(prev => [...prev, ...data.stories]);
      }
      
      setHasMoreStories(data.hasMore);
      setLastStoryDocId(data.lastDocId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
    fetchStories(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'stories' && stories.length === 0) {
      fetchStories(true);
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users?limit=100');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isCreatePostOpen || isCreateStoryOpen) {
      fetchUsers();
    }
  }, [isCreatePostOpen, isCreateStoryOpen]);

  const handleCreatePost = async () => {
    if (!postForm.ownerId || !postForm.mediaUrl) {
      alert('Please select a user and provide a media URL');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      // Reset form and close modal
      setPostForm({ ownerId: '', mediaUrl: '', description: '', location: '' });
      setIsCreatePostOpen(false);
      
      // Refresh posts
      fetchPosts(true);
      
      alert('Post created successfully!');
    } catch (err: any) {
      alert(`Failed to create post: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateStory = async () => {
    if (!storyForm.userId || !storyForm.imageUrl) {
      alert('Please select a user and provide an image URL');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create story');
      }

      // Reset form and close modal
      setStoryForm({ userId: '', imageUrl: '', caption: '', whoCanSee: [] });
      setIsCreateStoryOpen(false);
      
      // Refresh stories
      fetchStories(true);
      
      alert('Story created successfully!');
    } catch (err: any) {
      alert(`Failed to create story: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const fetchUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      
      const data = await response.json();
      return data.user as User;
    } catch (err: any) {
      console.error('Error fetching user:', err);
      return null;
    }
  };

  const handleViewPost = async (post: Post) => {
    setSelectedPost(post);
    const user = await fetchUser(post.ownerId);
    if (user) {
      setSelectedUser(user);
    }
  };

  const handleViewUser = async (userId: string) => {
    const user = await fetchUser(userId);
    if (user) {
      setSelectedUser(user);
      setSelectedPost(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(postId);
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete post');
      
      setPosts(posts.filter(p => p.id !== postId));
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
        setSelectedUser(null);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`Failed to delete post: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleViewStory = async (story: Story) => {
    setSelectedStory(story);
    const user = await fetchUser(story.userId);
    if (user) {
      setSelectedUser(user);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(storyId);
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete story');
      
      setStories(stories.filter(s => s.id !== storyId));
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
        setSelectedUser(null);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`Failed to delete story: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (user: User | null, username: string) => {
    if (user) {
      if (user.firstname && user.lastname) {
        return `${user.firstname} ${user.lastname}`;
      }
      if (user.firstname) return user.firstname;
      if (user.username) return user.username;
    }
    return username || 'Unknown User';
  };

  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase();
    return (
      post.username?.toLowerCase().includes(query) ||
      post.description?.toLowerCase().includes(query) ||
      post.location?.toLowerCase().includes(query)
    );
  });

  const filteredStories = stories.filter(story => {
    const query = searchQuery.toLowerCase();
    return (
      story.username?.toLowerCase().includes(query) ||
      story.caption?.toLowerCase().includes(query)
    );
  });

  const getTimeUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Unknown';
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (selectedStory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedStory(null);
              setSelectedUser(null);
            }}
            className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-iki-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-iki-brown font-goldplay">Story Details</h2>
            <p className="text-iki-white/60 body-sm">View story and user information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Story Details */}
          <div className="glass rounded-2xl p-6 border border-light-green/10 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-iki-white">Story Information</h3>
              <button
                onClick={() => handleDeleteStory(selectedStory.id)}
                disabled={deleting === selectedStory.id}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50 flex items-center gap-2 body-sm"
              >
                <Trash2 className="w-4 h-4" />
                {deleting === selectedStory.id ? 'Deleting...' : 'Delete Story'}
              </button>
            </div>

            {selectedStory.imageUrl && (
              <div className="aspect-[9/16] rounded-xl overflow-hidden bg-iki-grey/30">
                <img
                  src={selectedStory.imageUrl}
                  alt={selectedStory.caption || 'Story image'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {selectedStory.caption && (
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Caption</p>
                <p className="text-iki-white whitespace-pre-wrap">{selectedStory.caption}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-light-green/10">
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Viewers</p>
                <p className="text-lg font-semibold text-iki-brown flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {selectedStory.viewers?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Posted</p>
                <p className="text-sm font-semibold text-iki-white flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedStory.timestamp)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-iki-white/60 mb-1">Expires</p>
                <p className="text-sm font-semibold text-iki-white flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getTimeUntilExpiry(selectedStory.expiresAt)}
                </p>
              </div>
              {selectedStory.whoCanSee && selectedStory.whoCanSee.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-iki-white/60 mb-1">Visibility</p>
                  <p className="text-sm font-semibold text-iki-white">
                    Private ({selectedStory.whoCanSee.length} users)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="glass rounded-2xl p-6 border border-light-green/10 space-y-4">
            <h3 className="text-lg font-semibold text-iki-white">User Information</h3>

            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedUser.photoUrl ? (
                    <img
                      src={selectedUser.photoUrl}
                      alt={getDisplayName(selectedUser, selectedStory.username)}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-iki-grey/50 flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-iki-white/60" />
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-iki-white">
                      {getDisplayName(selectedUser, selectedStory.username)}
                    </p>
                    <p className="text-sm text-iki-white/60">@{selectedStory.username}</p>
                  </div>
                </div>

                {selectedUser.email && (
                  <div>
                    <p className="text-sm text-iki-white/60 mb-1">Email</p>
                    <p className="text-iki-white">{selectedUser.email}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedStory(null);
                    setSelectedUser(selectedUser);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-iki-brown/20 hover:bg-iki-brown/30 text-iki-brown transition-colors flex items-center justify-center gap-2 body-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View User Profile in Admin
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-iki-brown border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-iki-white/60">Loading user information...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedPost(null);
              setSelectedUser(null);
            }}
            className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-iki-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-light-green font-goldplay">Post Details</h2>
            <p className="text-iki-white/60 body-sm">View post and user information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Post Details */}
          <div className="glass rounded-2xl p-6 border border-light-green/10 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-iki-white">Post Information</h3>
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                disabled={deleting === selectedPost.id}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50 flex items-center gap-2 body-sm"
              >
                <Trash2 className="w-4 h-4" />
                {deleting === selectedPost.id ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>

            {selectedPost.mediaUrl && (
              <div className="aspect-square rounded-xl overflow-hidden bg-iki-grey/30">
                <img
                  src={selectedPost.mediaUrl}
                  alt={selectedPost.description || 'Post image'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {selectedPost.description && (
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Description</p>
                <p className="text-iki-white whitespace-pre-wrap">{selectedPost.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-light-green/10">
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Likes</p>
                <p className="text-lg font-semibold text-light-green flex items-center gap-1">
                  <Heart className="w-4 h-4 fill-light-green" />
                  {selectedPost.likesCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-iki-white/60 mb-1">Posted</p>
                <p className="text-sm font-semibold text-iki-white flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedPost.timestamp)}
                </p>
              </div>
              {selectedPost.location && (
                <div className="col-span-2">
                  <p className="text-sm text-iki-white/60 mb-1">Location</p>
                  <p className="text-sm font-semibold text-iki-white flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedPost.location}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="glass rounded-2xl p-6 border border-light-green/10 space-y-4">
            <h3 className="text-lg font-semibold text-iki-white">User Information</h3>

            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedUser.photoUrl ? (
                    <img
                      src={selectedUser.photoUrl}
                      alt={getDisplayName(selectedUser, selectedPost.username)}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-iki-grey/50 flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-iki-white/60" />
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-iki-white">
                      {getDisplayName(selectedUser, selectedPost.username)}
                    </p>
                    <p className="text-sm text-iki-white/60">@{selectedPost.username}</p>
                  </div>
                </div>

                {selectedUser.email && (
                  <div>
                    <p className="text-sm text-iki-white/60 mb-1">Email</p>
                    <p className="text-iki-white">{selectedUser.email}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedPost(null);
                    setSelectedUser(selectedUser);
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-light-green/20 hover:bg-light-green/30 text-light-green transition-colors flex items-center justify-center gap-2 body-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View User Profile in Admin
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-light-green border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-iki-white/60">Loading user information...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedUser) {
    const userPosts = posts.filter(p => p.ownerId === selectedUser.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedUser(null)}
            className="p-2 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-iki-white" />
          </button>
          <div className="flex items-center gap-4">
            {selectedUser.photoUrl ? (
              <img
                src={selectedUser.photoUrl}
                alt={getDisplayName(selectedUser, '')}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-iki-grey/50 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-iki-white/60" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-light-green font-goldplay">
                {getDisplayName(selectedUser, '')}
              </h2>
              <p className="text-iki-white/60 body-sm">{selectedUser.email}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-light-green/10">
          <h3 className="text-lg font-semibold text-iki-white mb-4">
            User Posts ({userPosts.length})
          </h3>
          {userPosts.length === 0 ? (
            <p className="text-iki-white/60 text-center py-8">This user hasn't posted anything yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-iki-grey/30 rounded-xl overflow-hidden cursor-pointer hover:bg-iki-grey/50 transition-colors group"
                  onClick={() => handleViewPost(post)}
                >
                  {post.mediaUrl ? (
                    <div className="aspect-square relative">
                      <img
                        src={post.mediaUrl}
                        alt={post.description || 'Post'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                          View Post
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-iki-grey/50 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-iki-white/40" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm text-iki-white/80 line-clamp-2">
                      {post.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-iki-white/60">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likesCount}
                      </span>
                      <span>{formatDate(post.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-light-green font-goldplay flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Connect Content Management
          </h2>
          <p className="text-iki-white/60 body-sm mt-1">View and manage all user posts and stories globally</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="px-4 py-2 rounded-lg bg-light-green/20 hover:bg-light-green/30 text-light-green transition-colors flex items-center gap-2 body-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </button>
          <button
            onClick={() => setIsCreateStoryOpen(true)}
            className="px-4 py-2 rounded-lg bg-iki-brown/20 hover:bg-iki-brown/30 text-iki-brown transition-colors flex items-center gap-2 body-sm font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Create Story
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-light-green/10">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 font-medium transition-all border-b-2 ${
            activeTab === 'posts'
              ? 'border-light-green text-light-green'
              : 'border-transparent text-iki-white/60 hover:text-iki-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`px-6 py-3 font-medium transition-all border-b-2 ${
            activeTab === 'stories'
              ? 'border-iki-brown text-iki-brown'
              : 'border-transparent text-iki-white/60 hover:text-iki-white'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          Stories ({stories.length})
        </button>
      </div>

      {/* Search */}
      <div className="glass rounded-xl p-4 border border-light-green/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-iki-white/40" />
          <input
            type="text"
            placeholder={activeTab === 'posts' 
              ? "Search posts by username, description, or location..."
              : "Search stories by username or caption..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors"
          />
        </div>
      </div>

      {/* Content Grid */}
      {activeTab === 'posts' ? (
        <>
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-light-green border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-iki-white/60">Loading posts...</p>
            </div>
          ) : error ? (
            <div className="glass rounded-2xl p-6 border border-red-500/20 bg-red-500/10">
              <p className="text-red-400">Error: {error}</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-iki-white/60">No posts found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="glass rounded-xl overflow-hidden border border-light-green/10 hover:border-light-green/30 transition-all cursor-pointer group"
                onClick={() => handleViewPost(post)}
              >
                {post.mediaUrl ? (
                  <div className="aspect-square relative">
                    <img
                      src={post.mediaUrl}
                      alt={post.description || 'Post'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                      <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                        Click to view
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-iki-grey/30 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-iki-white/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-iki-grey/50 flex items-center justify-center overflow-hidden">
                      {selectedUser?.photoUrl && selectedUser.id === post.ownerId ? (
                        <img
                          src={selectedUser.photoUrl}
                          alt={post.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-3 h-3 text-iki-white/60" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-iki-white truncate">@{post.username}</p>
                  </div>
                  {post.description && (
                    <p className="text-sm text-iki-white/80 line-clamp-2 mb-2">
                      {post.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-iki-white/60">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likesCount}
                    </span>
                    <span>{formatDate(post.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={() => fetchPosts(false)}
                className="px-6 py-3 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors body-sm font-medium"
              >
                Load More Posts
              </button>
            </div>
          )}
            </>
          )}
        </>
      ) : (
        <>
          {loadingStories ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-iki-brown border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-iki-white/60">Loading stories...</p>
            </div>
          ) : error ? (
            <div className="glass rounded-2xl p-6 border border-red-500/20 bg-red-500/10">
              <p className="text-red-400">Error: {error}</p>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-iki-white/60">No stories found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStories.map((story) => (
                  <div
                    key={story.id}
                    className="glass rounded-xl overflow-hidden border border-iki-brown/10 hover:border-iki-brown/30 transition-all cursor-pointer group"
                    onClick={() => handleViewStory(story)}
                  >
                    {story.imageUrl ? (
                      <div className="aspect-[9/16] relative">
                        <img
                          src={story.imageUrl}
                          alt={story.caption || 'Story'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                          <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                            Click to view
                          </p>
                        </div>
                        <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1">
                          <p className="text-white text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeUntilExpiry(story.expiresAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[9/16] bg-iki-grey/30 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-iki-white/40" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {story.userDp ? (
                          <img
                            src={story.userDp}
                            alt={story.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-iki-grey/50 flex items-center justify-center overflow-hidden">
                            <UserIcon className="w-3 h-3 text-iki-white/60" />
                          </div>
                        )}
                        <p className="text-sm font-semibold text-iki-white truncate">@{story.username}</p>
                      </div>
                      {story.caption && (
                        <p className="text-sm text-iki-white/80 line-clamp-2 mb-2">
                          {story.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-iki-white/60">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {story.viewers?.length || 0}
                        </span>
                        <span>{formatDate(story.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {hasMoreStories && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => fetchStories(false)}
                    className="px-6 py-3 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors body-sm font-medium"
                  >
                    Load More Stories
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Post Modal */}
      {isCreatePostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 border border-light-green/20 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-light-green font-goldplay">Create New Post</h3>
              <button
                onClick={() => setIsCreatePostOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/50 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Select User *
                </label>
                <select
                  value={postForm.ownerId}
                  onChange={(e) => setPostForm({ ...postForm, ownerId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white focus:outline-none focus:border-light-green/50 transition-colors"
                  disabled={loadingUsers}
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstname && user.lastname
                        ? `${user.firstname} ${user.lastname}`
                        : user.username || user.email || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <ImageUpload
                label="Upload Image *"
                onUploadComplete={(url) => setPostForm({ ...postForm, mediaUrl: url })}
                currentUrl={postForm.mediaUrl}
                className="mb-4"
              />

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Description
                </label>
                <textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                  placeholder="Post description..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={postForm.location}
                  onChange={(e) => setPostForm({ ...postForm, location: e.target.value })}
                  placeholder="Location (optional)"
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleCreatePost}
                  disabled={creating || !postForm.ownerId || !postForm.mediaUrl}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-light-green/20 hover:bg-light-green/30 text-light-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creating ? 'Creating...' : 'Create Post'}
                </button>
                <button
                  onClick={() => setIsCreatePostOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {isCreateStoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 border border-light-green/20 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-iki-brown font-goldplay">Create New Story</h3>
              <button
                onClick={() => setIsCreateStoryOpen(false)}
                className="p-2 rounded-lg hover:bg-iki-grey/50 transition-colors"
              >
                <X className="w-5 h-5 text-iki-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Select User *
                </label>
                <select
                  value={storyForm.userId}
                  onChange={(e) => setStoryForm({ ...storyForm, userId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white focus:outline-none focus:border-light-green/50 transition-colors"
                  disabled={loadingUsers}
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstname && user.lastname
                        ? `${user.firstname} ${user.lastname}`
                        : user.username || user.email || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <ImageUpload
                label="Upload Story Image *"
                onUploadComplete={(url) => setStoryForm({ ...storyForm, imageUrl: url })}
                currentUrl={storyForm.imageUrl}
                className="mb-4"
              />

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Caption
                </label>
                <textarea
                  value={storyForm.caption}
                  onChange={(e) => setStoryForm({ ...storyForm, caption: e.target.value })}
                  placeholder="Story caption..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-iki-white/80 mb-2">
                  Who Can See (User IDs, comma-separated)
                </label>
                <input
                  type="text"
                  value={storyForm.whoCanSee.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                    setStoryForm({ ...storyForm, whoCanSee: values });
                  }}
                  placeholder="user1, user2, user3 (leave empty for public)"
                  className="w-full px-4 py-2.5 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white placeholder:text-iki-white/40 focus:outline-none focus:border-light-green/50 transition-colors"
                />
                <p className="text-xs text-iki-white/50 mt-1">Leave empty for public story</p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleCreateStory}
                  disabled={creating || !storyForm.userId || !storyForm.imageUrl}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-iki-brown/20 hover:bg-iki-brown/30 text-iki-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creating ? 'Creating...' : 'Create Story'}
                </button>
                <button
                  onClick={() => setIsCreateStoryOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-iki-grey/50 hover:bg-iki-grey/70 text-iki-white transition-colors"
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

