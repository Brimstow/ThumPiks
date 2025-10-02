import React from 'react';

interface AdvancedAnalyticsProps {
  theme: 'light' | 'dark';
  advancedAnalytics: {
    productivity: {
      bestDay: { date: string; count: number } | null;
      bestHour: { hour: number; count: number };
      consistency: number;
    };
    editing: {
      mostComplexThumbnail: {
        id: string;
        title: string;
        editCount: number;
      } | null;
      averageEditComplexity: number;
    };
    engagement: {
      mostShared: { id: string; title: string; shareCount: number } | null;
      sharingRate: number;
    };
  };
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  theme,
  advancedAnalytics,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Productivity Card */}
      <div
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}
      >
        <h3
          className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}
        >
          Productivity Insights
        </h3>
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Best Creation Day
            </h4>
            {advancedAnalytics.productivity.bestDay ? (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {new Date(
                  advancedAnalytics.productivity.bestDay.date
                ).toLocaleDateString()}
                <span
                  className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  ({advancedAnalytics.productivity.bestDay.count} thumbnails)
                </span>
              </p>
            ) : (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Not enough data
              </p>
            )}
          </div>

          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Best Creation Hour
            </h4>
            <p
              className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              {advancedAnalytics.productivity.bestHour.hour}:00
              <span
                className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                ({advancedAnalytics.productivity.bestHour.count} thumbnails)
              </span>
            </p>
          </div>

          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Creation Consistency
            </h4>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span
                  className={
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }
                >
                  Consistency
                </span>
                <span
                  className={theme === 'dark' ? 'text-white' : 'text-gray-900'}
                >
                  {advancedAnalytics.productivity.consistency}%
                </span>
              </div>
              <div
                className={`w-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}
              >
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${advancedAnalytics.productivity.consistency}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editing Card */}
      <div
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}
      >
        <h3
          className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}
        >
          Editing Insights
        </h3>
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Most Complex Thumbnail
            </h4>
            {advancedAnalytics.editing.mostComplexThumbnail ? (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {advancedAnalytics.editing.mostComplexThumbnail.title}
                <span
                  className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  ({advancedAnalytics.editing.mostComplexThumbnail.editCount}{' '}
                  edits)
                </span>
              </p>
            ) : (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                No edited thumbnails
              </p>
            )}
          </div>

          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Average Edit Complexity
            </h4>
            <p
              className={`mt-1 text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              {advancedAnalytics.editing.averageEditComplexity}
            </p>
            <p
              className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              edits per thumbnail
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Card */}
      <div
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}
      >
        <h3
          className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}
        >
          Engagement Insights
        </h3>
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Most Shared Thumbnail
            </h4>
            {advancedAnalytics.engagement.mostShared ? (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {advancedAnalytics.engagement.mostShared.title}
                <span
                  className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  ({advancedAnalytics.engagement.mostShared.shareCount} shares)
                </span>
              </p>
            ) : (
              <p
                className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                No shared thumbnails
              </p>
            )}
          </div>

          <div
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <h4
              className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Social Sharing Rate
            </h4>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span
                  className={
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }
                >
                  Sharing Rate
                </span>
                <span
                  className={theme === 'dark' ? 'text-white' : 'text-gray-900'}
                >
                  {advancedAnalytics.engagement.sharingRate}%
                </span>
              </div>
              <div
                className={`w-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}
              >
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${advancedAnalytics.engagement.sharingRate}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
