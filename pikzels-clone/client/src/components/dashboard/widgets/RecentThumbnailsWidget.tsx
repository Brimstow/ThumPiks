import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export const RecentThumbnailsWidget: React.FC = () => {
  const navigate = useNavigate();
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentThumbnails();
  }, []);

  const fetchRecentThumbnails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/thumbnails?limit=3&sort=recent`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch thumbnails');
      }

      const data = await response.json();
      setThumbnails(data.thumbnails || []);
    } catch (err) {
      console.error('Error fetching recent thumbnails:', err);
      setError('Failed to load recent thumbnails');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-50">Recent Thumbnails</h3>
        <button
          onClick={() => navigate('/dashboard/thumbnails')}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-slate-400">
          <p>{error}</p>
        </div>
      ) : thumbnails.length === 0 ? (
        <div className="text-center py-8">
          <Image className="w-12 h-12 mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400">No thumbnails yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first thumbnail to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {thumbnails.map((thumbnail) => (
            <div
              key={thumbnail.id}
              onClick={() => navigate(`/dashboard/editor/${thumbnail.id}`)}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                <img
                  src={thumbnail.imageUrl}
                  alt={thumbnail.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80/1e293b/94a3b8?text=Thumbnail';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                  {thumbnail.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTimeAgo(thumbnail.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
