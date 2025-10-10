import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface SharedThumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  user: {
    name?: string;
  };
}

const SharedThumbnailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [thumbnail, setThumbnail] = useState<SharedThumbnail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSharedThumbnail = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/thumbnails/share/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          setThumbnail(data.thumbnail);
        } else {
          setError('Thumbnail not found or share link has expired');
        }
      } catch (err) {
        setError('Failed to load shared thumbnail');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedThumbnail();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared thumbnail...</p>
        </div>
      </div>
    );
  }

  if (error || !thumbnail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Share Link Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">{error}</p>
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to ThumbnailMaker
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Shared Thumbnail
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Created by {thumbnail.user.name || 'ThumbnailMaker User'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="aspect-w-16 aspect-h-9">
            <img
              src={thumbnail.imageUrl}
              alt={thumbnail.title}
              className="object-cover w-full h-96"
            />
          </div>
          
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {thumbnail.title}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {thumbnail.prompt}
            </p>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Created on {new Date(thumbnail.createdAt).toLocaleDateString()}
              </span>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = thumbnail.imageUrl;
                    link.download = `${thumbnail.title}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Download
                </button>
                
                <a
                  href="/register"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Your Own
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Want to create amazing thumbnails like this?
          </p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Try ThumbnailMaker Free
          </a>
        </div>
      </div>
    </div>
  );
};

export default SharedThumbnailPage;