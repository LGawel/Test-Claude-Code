import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  MessageSquare, Image, Send, Trash2, Snowflake, ArrowLeft, MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

function BulletinBoard() {
  const { poolId } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [pool, setPool] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    loadData();
  }, [poolId]);

  const loadData = async () => {
    try {
      const [poolRes, postsRes] = await Promise.all([
        api.get(`/pools/${poolId}`),
        api.get(`/posts/pool/${poolId}`)
      ]);
      setPool(poolRes.data);
      setPosts(postsRes.data.posts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !selectedImage) return;

    setPosting(true);

    try {
      const formData = new FormData();
      if (newPost.trim()) formData.append('content', newPost);
      if (selectedImage) formData.append('image', selectedImage);

      const response = await api.post(`/posts/pool/${poolId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPosts([response.data.post, ...posts]);
      setNewPost('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return;

    try {
      await api.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const loadComments = async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(prev => ({ ...prev, [postId]: response.data }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
    } else {
      setExpandedComments(prev => ({ ...prev, [postId]: true }));
      if (!comments[postId]) {
        await loadComments(postId);
      }
    }
  };

  const handleComment = async (postId) => {
    const content = newComment[postId]?.trim();
    if (!content) return;

    try {
      const response = await api.post(`/posts/${postId}/comments`, { content });
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), response.data.comment]
      }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      // Update comment count
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
      ));
    } catch (error) {
      console.error('Failed to comment:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <Link
          to={`/pools/${poolId}`}
          className="flex items-center gap-2 text-ice-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Terug naar {pool?.name}
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-ice-400" />
          Prikbord
        </h1>
        <p className="text-ice-400 mt-1">Deel memes en praat met je poule-genoten</p>
      </div>

      {/* New post form */}
      <div className="card p-6">
        <form onSubmit={handlePost}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="input-field resize-none mb-4"
            rows={3}
            placeholder="Deel een meme of bericht met je poule..."
          />

          {selectedImage && (
            <div className="relative mb-4 inline-block">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="max-h-40 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
            >
              <Image className="w-5 h-5" />
              Afbeelding
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <button
              type="submit"
              disabled={posting || (!newPost.trim() && !selectedImage)}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {posting ? (
                <Snowflake className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Plaatsen
            </button>
          </div>
        </form>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-ice-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nog geen berichten</h2>
          <p className="text-ice-400">Wees de eerste die iets plaatst!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="card p-6">
              {/* Post header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {post.profile_image ? (
                    <img
                      src={post.profile_image}
                      alt={post.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ice-600 flex items-center justify-center">
                      {post.nickname?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{post.nickname}</p>
                    <p className="text-sm text-ice-500">
                      {formatDistanceToNow(new Date(post.created_at), { locale: nl, addSuffix: true })}
                    </p>
                  </div>
                </div>

                {(post.user_id === user?.id || pool?.created_by === user?.id) && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-ice-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Post content */}
              {post.content && (
                <p className="text-ice-200 mb-4 whitespace-pre-wrap">{post.content}</p>
              )}

              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post afbeelding"
                  className="rounded-lg max-h-96 w-auto mb-4"
                />
              )}

              {/* Comments section */}
              <div className="border-t border-ice-700/30 pt-4">
                <button
                  onClick={() => toggleComments(post.id)}
                  className="text-ice-400 hover:text-white flex items-center gap-2 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  {post.comment_count || 0} reacties
                </button>

                {expandedComments[post.id] && (
                  <div className="mt-4 space-y-3">
                    {/* Comments list */}
                    {comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 pl-4 border-l-2 border-ice-700/30">
                        {comment.profile_image ? (
                          <img
                            src={comment.profile_image}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-ice-700 flex items-center justify-center flex-shrink-0 text-sm">
                            {comment.nickname?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm">{comment.nickname}</span>
                            <span className="text-xs text-ice-500">
                              {formatDistanceToNow(new Date(comment.created_at), { locale: nl, addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-ice-300">{comment.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* New comment input */}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={newComment[post.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        className="input-field flex-1 py-2 text-sm"
                        placeholder="Schrijf een reactie..."
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!newComment[post.id]?.trim()}
                        className="btn-primary px-3 py-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BulletinBoard;
