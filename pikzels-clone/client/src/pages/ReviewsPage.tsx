import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Users, Zap, User, MessageSquarePlus, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authGet, authPost, authPut, authDelete } from '../utils/api';
import config from '../config/environment';

interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  channelName: string | null;
  subscribers: string | null;
  niche: string | null;
  improvement: string | null;
  isFeatured: boolean;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  totalUsers: number;
  totalThumbnails: number;
}

interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  channelName: string | null;
  channelUrl: string | null;
  subscribers: string | null;
  niche: string | null;
  improvement: string | null;
  status: string;
  createdAt: string;
}

const PLACEHOLDER_COUNT = 6;

const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form state
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formChannel, setFormChannel] = useState('');
  const [formSubscribers, setFormSubscribers] = useState('');
  const [formNiche, setFormNiche] = useState('');
  const [formImprovement, setFormImprovement] = useState('');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/public`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch {
      // Silently fail — show placeholders
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Use defaults
    }
  }, []);

  const fetchMyReview = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authGet('/api/reviews/mine');
      if (res.ok) {
        const data = await res.json();
        setMyReview(data.review || null);
        if (data.review) {
          setFormRating(data.review.rating);
          setFormTitle(data.review.title || '');
          setFormBody(data.review.body || '');
          setFormChannel(data.review.channelName || '');
          setFormSubscribers(data.review.subscribers || '');
          setFormNiche(data.review.niche || '');
          setFormImprovement(data.review.improvement || '');
        }
      }
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchReviews(), fetchStats(), fetchMyReview()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchReviews, fetchStats, fetchMyReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBody.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const payload = {
        rating: formRating,
        title: formTitle.trim() || undefined,
        body: formBody.trim(),
        channelName: formChannel.trim() || undefined,
        subscribers: formSubscribers.trim() || undefined,
        niche: formNiche.trim() || undefined,
        improvement: formImprovement.trim() || undefined,
      };

      const res = myReview
        ? await authPut('/api/reviews/mine', payload)
        : await authPost('/api/reviews', payload);

      if (res.ok) {
        setSubmitSuccess(true);
        setShowForm(false);
        await fetchMyReview();
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit review');
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await authDelete('/api/reviews/mine');
      if (res.ok || res.status === 204) {
        setMyReview(null);
        setFormRating(5);
        setFormTitle('');
        setFormBody('');
        setFormChannel('');
        setFormSubscribers('');
        setFormNiche('');
        setFormImprovement('');
        setSubmitSuccess(false);
        await fetchReviews();
      }
    } catch {
      // Ignore
    }
  };

  const hasReviews = reviews.length > 0;

  const displayStats = [
    { value: stats ? `${stats.totalUsers}` : '—', label: 'Active Creators', icon: <Users className="w-6 h-6" /> },
    { value: stats ? `${stats.totalThumbnails.toLocaleString()}` : '—', label: 'Thumbnails Generated', icon: <Zap className="w-6 h-6" /> },
    { value: stats && stats.totalReviews > 0 ? `${stats.averageRating.toFixed(1)}/5` : '—', label: 'Avg Creator Rating', icon: <Star className="w-6 h-6" /> },
    { value: stats ? `${stats.totalReviews}` : '0', label: 'Reviews', icon: <TrendingUp className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-white rounded"></div>
            <span>ThumPiks</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
            {authLoading ? null : isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
              >
                Start Free
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mb-8">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm">
              {hasReviews
                ? `${reviews.length} unbiased creator review${reviews.length !== 1 ? 's' : ''}`
                : 'Be the first to share your experience'}
            </span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Creator
            <br />
            <span className="text-blue-500">Reviews</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10">
            {hasReviews
              ? 'Honest reviews from real ThumPiks creators'
              : 'No reviews yet — your honest feedback could be the first one here'}
          </p>
          {authLoading ? null : isAuthenticated ? (
            !myReview && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setTimeout(() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <MessageSquarePlus className="w-5 h-5" />
                Write a Review
              </button>
            )
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              <MessageSquarePlus className="w-5 h-5" />
              Sign In to Review
            </button>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {displayStats.map((stat, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-600/50 transition-colors"
              >
                <div className="flex justify-center mb-4 text-blue-500">
                  {stat.icon}
                </div>
                <div className="text-4xl font-light mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* My Review Status (for logged-in users) */}
      {isAuthenticated && myReview && (
        <section className="px-6 pb-8">
          <div className="max-w-3xl mx-auto">
            <div className={`border rounded-2xl p-6 ${
              myReview.status === 'APPROVED'
                ? 'bg-green-900/20 border-green-600/30'
                : myReview.status === 'REJECTED'
                ? 'bg-red-900/20 border-red-600/30'
                : 'bg-yellow-900/20 border-yellow-600/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {myReview.status === 'APPROVED' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {myReview.status === 'PENDING' && <Loader2 className="w-5 h-5 text-yellow-500" />}
                  {myReview.status === 'REJECTED' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-medium">
                    {myReview.status === 'APPROVED' && 'Your review is live!'}
                    {myReview.status === 'PENDING' && 'Your review is pending approval'}
                    {myReview.status === 'REJECTED' && 'Your review was not approved'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {myReview.status !== 'APPROVED' && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={handleDeleteReview}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < myReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              <p className="text-gray-300 text-sm">{myReview.body}</p>
            </div>
          </div>
        </section>
      )}

      {/* Review Form (for logged-in users without a review, or editing) */}
      {isAuthenticated && (showForm || (!myReview && !submitSuccess)) && (
        <section id="review-form" className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900/50 border border-blue-600/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquarePlus className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-medium">
                  {myReview ? 'Edit Your Review' : 'Write Your Review'}
                </h3>
              </div>

              {submitError && (
                <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= formRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title (optional)</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Sum up your experience in a few words"
                    maxLength={200}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Your Review *</label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Share your honest experience with ThumPiks..."
                    maxLength={2000}
                    rows={4}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="text-xs text-gray-500 text-right mt-1">{formBody.length}/2000</div>
                </div>

                {/* Channel Info (optional row) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Channel Name</label>
                    <input
                      type="text"
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value)}
                      placeholder="@YourChannel"
                      maxLength={100}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Subscribers</label>
                    <input
                      type="text"
                      value={formSubscribers}
                      onChange={(e) => setFormSubscribers(e.target.value)}
                      placeholder="e.g. 50K"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Niche</label>
                    <input
                      type="text"
                      value={formNiche}
                      onChange={(e) => setFormNiche(e.target.value)}
                      placeholder="e.g. Gaming, Tech"
                      maxLength={50}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Improvement */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Key Improvement (optional)</label>
                  <input
                    type="text"
                    value={formImprovement}
                    onChange={(e) => setFormImprovement(e.target.value)}
                    placeholder="e.g. +120% CTR, 3 hrs/week saved"
                    maxLength={100}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">Your review will be visible after admin approval</p>
                  <button
                    type="submit"
                    disabled={submitting || !formBody.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submitting ? 'Submitting...' : myReview ? 'Update Review' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Success Message */}
      {submitSuccess && !showForm && (
        <section className="px-6 pb-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-green-900/20 border border-green-600/30 rounded-2xl p-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-300">
                Thank you for your review! It will appear here once approved by our team.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Grid — Real reviews or placeholder silhouettes */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              {hasReviews
                ? <>What Creators <span className="text-blue-500">Are Saying</span></>
                : <>Be the <span className="text-blue-500">First</span></>
              }
            </h2>
            <p className="text-gray-400 text-lg">
              {hasReviews
                ? 'Unbiased reviews from real ThumPiks users'
                : 'No reviews yet — these spots are waiting for real creators like you'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hasReviews ? (
              // Real reviews
              reviews.map((review) => (
                <div key={review.id} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {review.authorAvatar ? (
                      <img
                        src={review.authorAvatar}
                        alt={review.authorName}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-7 h-7 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{review.authorName}</h4>
                      {review.channelName && (
                        <p className="text-sm text-gray-400">
                          {review.channelName}
                          {review.subscribers && ` • ${review.subscribers} subs`}
                        </p>
                      )}
                    </div>
                  </div>
                  {review.title && (
                    <h3 className="font-semibold mb-2">{review.title}</h3>
                  )}
                  <p className="text-gray-300 text-sm leading-relaxed">
                    "{review.body}"
                  </p>
                  <div className="flex gap-1 mt-4">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={i <= review.rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                    ))}
                  </div>
                  {review.improvement && (
                    <p className="text-sm text-green-400 mt-3">{review.improvement}</p>
                  )}
                </div>
              ))
            ) : (
              // Placeholder silhouette cards
              [...Array(PLACEHOLDER_COUNT)].map((_, index) => (
                <div key={index} className="bg-gray-900/30 border border-gray-800/50 border-dashed rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gray-800/50 flex items-center justify-center">
                      <User className="w-7 h-7 text-gray-700" />
                    </div>
                    <div>
                      <div className="h-3 bg-gray-800/50 rounded w-24 mb-2"></div>
                      <div className="h-2 bg-gray-800/50 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-800/40 rounded w-full"></div>
                    <div className="h-3 bg-gray-800/40 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-800/40 rounded w-4/6"></div>
                  </div>
                  <div className="flex gap-1 mt-4">
                    {[1,2,3,4,5].map(i => <span key={i} className="text-gray-700">★</span>)}
                  </div>
                  {index === 0 && (
                    <p className="text-gray-500 text-xs italic mt-3 text-center">Your review could be here</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Write Review CTA (for non-logged-in users) */}
      {!authLoading && !isAuthenticated && (
        <section className="py-20 px-6 bg-gray-900/30">
          <div className="max-w-3xl mx-auto text-center">
            <MessageSquarePlus className="w-12 h-12 text-blue-500 mx-auto mb-6" />
            <h2 className="text-4xl font-light mb-4">
              Share Your <span className="text-blue-500">Experience</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Sign in to write an honest, unbiased review of ThumPiks.
              <br />
              Every review helps fellow creators make informed decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Sign In to Review
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-16 text-center">
            <h2 className="text-5xl font-light mb-6">
              Try ThumPiks
              <br />
              <span className="text-blue-500">For Yourself</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              See why creators love it — start creating thumbnails today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/#pricing')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View Pricing
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">No credit card required • 14-day free trial</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} ThumPiks LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ReviewsPage;
