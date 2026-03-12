import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Loader2 } from 'lucide-react';
import { authGet } from '../../../utils/api';
import { formatRelativeTime } from '../../../lib/formatters';

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
      const response = await authGet('/api/thumbnails?limit=3&sort=recent');

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

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col" style={{ maxHeight: '480px' }}>
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
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {thumbnails.slice(0, 6).map((thumbnail) => (
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
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect fill="%231e293b" width="80" height="80"/%3E%3Ctext fill="%2394a3b8" font-family="Arial" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EThumbnail%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                  {thumbnail.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatRelativeTime(thumbnail.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
