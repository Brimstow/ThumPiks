import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  RefreshCw,
  AlertCircle,
  Trophy,
  Eye,
  MousePointer,
  TrendingUp,
  X,
} from 'lucide-react';
import { authGet, authPost, authDelete } from '../../utils/api';

// ============================================
// TYPES
// ============================================

interface ABTestVariant {
  id: string;
  name: string;
  thumbnailId: string;
  thumbnailUrl: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  isControl: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  variants: ABTestVariant[];
  totalImpressions: number;
  totalClicks: number;
  winner: ABTestVariant | null;
}

// ============================================
// COMPONENT
// ============================================

const ABTestingPage: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [newTestName, setNewTestName] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');
  const [newVariants, setNewVariants] = useState([
    { name: 'Control (A)', thumbnailId: '', isControl: true },
    { name: 'Variant B', thumbnailId: '', isControl: false },
  ]);

  const fetchTests = useCallback(async () => {
    try {
      const response = await authGet('/api/ab-tests');
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      }
    } catch {
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreate = async () => {
    if (!newTestName.trim()) return;
    const validVariants = newVariants.filter((v) => v.thumbnailId.trim());
    if (validVariants.length < 2) {
      setError('At least 2 variants with thumbnail IDs are required');
      return;
    }

    setActionLoading('create');
    setError(null);

    try {
      const response = await authPost('/api/ab-tests', {
        name: newTestName.trim(),
        description: newTestDescription.trim() || undefined,
        variants: validVariants,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create test');
      }

      setShowCreate(false);
      setNewTestName('');
      setNewTestDescription('');
      setNewVariants([
        { name: 'Control (A)', thumbnailId: '', isControl: true },
        { name: 'Variant B', thumbnailId: '', isControl: false },
      ]);
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (
    testId: string,
    action: 'start' | 'pause' | 'complete' | 'delete'
  ) => {
    setActionLoading(`${action}-${testId}`);
    setError(null);

    try {
      let response;
      if (action === 'delete') {
        response = await authDelete(`/api/ab-tests/${testId}`);
      } else {
        response = await authPost(`/api/ab-tests/${testId}/${action}`, {});
      }

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} test`);
      }

      if (action === 'delete') {
        setSelectedTest(null);
      }
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} test`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'paused':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'completed':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const addVariant = () => {
    if (newVariants.length >= 5) return;
    const letter = String.fromCharCode(65 + newVariants.length); // C, D, E...
    setNewVariants([
      ...newVariants,
      { name: `Variant ${letter}`, thumbnailId: '', isControl: false },
    ]);
  };

  const removeVariant = (index: number) => {
    if (newVariants.length <= 2) return;
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              A/B Testing
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg">
              Test thumbnail variants and find the highest-performing design
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            New Test
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Create New A/B Test
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Test Name
              </label>
              <input
                type="text"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="e.g., Homepage Thumbnail CTR Test"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={newTestDescription}
                onChange={(e) => setNewTestDescription(e.target.value)}
                placeholder="What are you testing?"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Variants
                </label>
                <button
                  onClick={addVariant}
                  disabled={newVariants.length >= 5}
                  className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                  + Add Variant
                </button>
              </div>
              <div className="space-y-2">
                {newVariants.map((variant, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const updated = [...newVariants];
                        updated[idx].name = e.target.value;
                        setNewVariants(updated);
                      }}
                      className="w-full sm:w-40 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={variant.thumbnailId}
                      onChange={(e) => {
                        const updated = [...newVariants];
                        updated[idx].thumbnailId = e.target.value;
                        setNewVariants(updated);
                      }}
                      placeholder="Thumbnail ID"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {variant.isControl && (
                      <span className="flex items-center px-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg">
                        Control
                      </span>
                    )}
                    {newVariants.length > 2 && !variant.isControl && (
                      <button
                        onClick={() => removeVariant(idx)}
                        className="p-2 text-slate-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={
                !newTestName.trim() ||
                newVariants.filter((v) => v.thumbnailId.trim()).length < 2 ||
                actionLoading === 'create'
              }
              className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25"
            >
              {actionLoading === 'create' ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Test
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Test Detail View */}
      {selectedTest && (
        <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2 mb-6">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
                {selectedTest.name}
              </h3>
              {selectedTest.description && (
                <p className="text-sm text-slate-400 mt-1">
                  {selectedTest.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(selectedTest.status)}`}
              >
                {selectedTest.status}
              </span>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Eye className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">
                {selectedTest.totalImpressions}
              </div>
              <div className="text-xs text-slate-500">Impressions</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <MousePointer className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">
                {selectedTest.totalClicks}
              </div>
              <div className="text-xs text-slate-500">Clicks</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">
                {selectedTest.totalImpressions > 0
                  ? (
                      (selectedTest.totalClicks /
                        selectedTest.totalImpressions) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                %
              </div>
              <div className="text-xs text-slate-500">Avg CTR</div>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-3">
            {selectedTest.variants.map((variant) => {
              const isWinner = selectedTest.winner?.id === variant.id;
              return (
                <div
                  key={variant.id}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border ${
                    isWinner
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  {/* Thumbnail preview */}
                  <div className="w-16 sm:w-24 h-10 sm:h-14 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                    {variant.thumbnailUrl && (
                      <img
                        src={variant.thumbnailUrl}
                        alt={variant.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {variant.name}
                      </span>
                      {variant.isControl && (
                        <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                          Control
                        </span>
                      )}
                      {isWinner && (
                        <Trophy className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>{variant.impressions} impressions</span>
                      <span>{variant.clicks} clicks</span>
                      <span className="text-amber-400 font-medium">
                        {(variant.ctr * 100).toFixed(2)}% CTR
                      </span>
                    </div>
                  </div>

                  {/* CTR bar */}
                  <div className="w-full sm:w-32">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isWinner
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-slate-500'
                        }`}
                        style={{
                          width: `${Math.min(variant.ctr * 100, 100) * 5}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-6">
            {selectedTest.status === 'draft' && (
              <button
                onClick={() => handleAction(selectedTest.id, 'start')}
                disabled={actionLoading === `start-${selectedTest.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Start Test
              </button>
            )}
            {selectedTest.status === 'active' && (
              <>
                <button
                  onClick={() => handleAction(selectedTest.id, 'pause')}
                  disabled={actionLoading === `pause-${selectedTest.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={() => handleAction(selectedTest.id, 'complete')}
                  disabled={actionLoading === `complete-${selectedTest.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              </>
            )}
            {selectedTest.status === 'paused' && (
              <>
                <button
                  onClick={() => handleAction(selectedTest.id, 'start')}
                  disabled={actionLoading === `start-${selectedTest.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  onClick={() => handleAction(selectedTest.id, 'complete')}
                  disabled={actionLoading === `complete-${selectedTest.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              </>
            )}
            {(selectedTest.status === 'draft' ||
              selectedTest.status === 'completed') && (
              <button
                onClick={() => handleAction(selectedTest.id, 'delete')}
                disabled={actionLoading === `delete-${selectedTest.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50 ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 mb-4 shadow-lg shadow-amber-500/20">
            <BarChart2 className="w-full h-full text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No A/B Tests Yet
          </h3>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Create your first test to compare thumbnail designs and find
            which one drives the most clicks.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create First Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => setSelectedTest(test)}
              className="text-left bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white truncate pr-2">
                  {test.name}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${getStatusColor(test.status)}`}
                >
                  {test.status}
                </span>
              </div>

              <div className="flex gap-4 text-xs text-slate-400 mb-3">
                <span>{test.variants.length} variants</span>
                <span>{test.totalImpressions} impressions</span>
              </div>

              {/* Mini variant bars */}
              <div className="space-y-1.5">
                {test.variants.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16 truncate">
                      {v.name}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        style={{
                          width: `${Math.min(v.ctr * 100, 100) * 5}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">
                      {(v.ctr * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {test.winner && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                  <Trophy className="w-3 h-3" />
                  Winner: {test.winner.name}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ABTestingPage;
