import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { authGet } from '../utils/api';

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

interface SetFeaturedThumbnailProps {
  projectId: string;
  onClose: () => void;
  onSetFeatured: (thumbnailId: string) => void;
}

const SetFeaturedThumbnail: React.FC<SetFeaturedThumbnailProps> = ({
  projectId,
  onClose,
  onSetFeatured,
}) => {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(
    null
  );
  const isDark = document.documentElement.classList.contains('dark');
  const theme = isDark ? 'dark' : 'light';

  useEffect(() => {
    const fetchThumbnails = async () => {
      try {
        const response = await authGet(`/api/thumbnails?projectId=${projectId}`);

        if (response.ok) {
          const data = await response.json();
          setThumbnails(data.thumbnails);
        }
      } catch (error) {
        console.error('Error fetching thumbnails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnails();
  }, [projectId]);

  const handleSetFeatured = () => {
    if (selectedThumbnail) {
      onSetFeatured(selectedThumbnail);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2
              className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              Set Featured Thumbnail
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {thumbnails.length === 0 ? (
                <div
                  className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}
                >
                  <svg
                    className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3
                    className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                  >
                    No thumbnails
                  </h3>
                  <p
                    className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    This project doesn't have any thumbnails yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                    {thumbnails.map(thumbnail => (
                      <div
                        key={thumbnail.id}
                        onClick={() => setSelectedThumbnail(thumbnail.id)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                          selectedThumbnail === thumbnail.id
                            ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50'
                            : theme === 'dark'
                              ? 'border-gray-700'
                              : 'border-gray-200'
                        }`}
                      >
                        <div className="aspect-w-16 aspect-h-9">
                          <img
                            src={thumbnail.imageUrl}
                            alt={thumbnail.title}
                            className="object-cover w-full h-32"
                          />
                        </div>
                        <div
                          className={`p-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                        >
                          <p
                            className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                          >
                            {thumbnail.title}
                          </p>
                          <p
                            className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {thumbnail.prompt}
                          </p>
                        </div>
                        {selectedThumbnail === thumbnail.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <svg
                              className="h-8 w-8 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={onClose}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        theme === 'dark'
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetFeatured}
                      disabled={!selectedThumbnail}
                      className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                        selectedThumbnail
                          ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                          : 'bg-indigo-400 cursor-not-allowed'
                      }`}
                    >
                      Set as Featured
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetFeaturedThumbnail;
