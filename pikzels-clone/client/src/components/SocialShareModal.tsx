import React, { useState } from 'react';

interface SocialShareModalProps {
  thumbnailId: string;
  thumbnailTitle: string;
  onClose: () => void;
  onShare: (platforms: string[], message: string) => Promise<void>;
}

const SocialShareModal: React.FC<SocialShareModalProps> = ({
  thumbnailId,
  thumbnailTitle,
  onClose,
  onShare,
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [message, setMessage] = useState(
    `Check out this thumbnail: ${thumbnailTitle}`
  );
  const [isSharing, setIsSharing] = useState(false);
  const [shareResults, setShareResults] = useState<any[]>([]);

  const platforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦' },
    { id: 'facebook', name: 'Facebook', icon: '📘' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌' },
  ];

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(id => id !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const handleShare = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform to share to.');
      return;
    }

    setIsSharing(true);
    setShareResults([]);

    try {
      await onShare(selectedPlatforms, message);
    } catch (error) {
      console.error('Error sharing:', error);
      alert('An error occurred while sharing. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    if (!isSharing) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Share Thumbnail
          </h3>
          <button
            onClick={handleClose}
            disabled={isSharing}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
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

        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add a message to your post..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Share to
            </label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  disabled={isSharing}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    selectedPlatforms.includes(platform.id)
                      ? 'bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-500'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-50`}
                >
                  <span className="text-2xl mb-1">{platform.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {platform.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {shareResults.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Share Results
              </h4>
              <ul className="space-y-1">
                {shareResults.map((result, index) => (
                  <li key={index} className="text-sm flex items-center">
                    <span className="mr-2">{result.success ? '✅' : '❌'}</span>
                    <span>
                      {result.platform}:{' '}
                      {result.success ? 'Success' : result.error}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isSharing}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing || selectedPlatforms.length === 0}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialShareModal;
