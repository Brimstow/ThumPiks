import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  Key,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { adminUserService } from '../../services/admin';

interface User {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  adminRoles: Array<{
    role: string;
    isActive: boolean;
  }>;
  _count: {
    projects: number;
    thumbnails: number;
  };
}

interface UserFilters {
  search: string;
  isActive?: boolean;
  isVerified?: boolean;
  hasAdminRoles?: boolean;
}

interface UserStats {
  total: number;
  active: number;
  verified: number;
  admins: number;
  newThisMonth: number;
  newThisWeek: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({ search: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminUserService.getUsers({
        page: currentPage,
        limit: 20,
        search: filters.search || undefined,
        isActive: filters.isActive,
      });

      if (result.success && result.data) {
        // Normalize data shape — service may return flat user objects
        const normalized = (result.data as any[]).map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isVerified: u.isVerified ?? false,
          isActive: u.isActive ?? true,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
          adminRoles: u.adminRoles ?? (u.isAdmin ? [{ role: u.role || 'admin', isActive: true }] : []),
          _count: u._count ?? { projects: u.projectCount ?? 0, thumbnails: u.thumbnailCount ?? 0 },
        }));
        setUsers(normalized);
        setTotalPages(result.pagination?.totalPages ?? 1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  }, [currentPage, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await adminUserService.getUserStats();
      if (result.success && result.data) {
        const d = result.data as any;
        setStats({
          total: d.totalUsers ?? d.total ?? 0,
          active: d.activeUsers ?? d.active ?? 0,
          verified: d.verifiedUsers ?? d.verified ?? 0,
          admins: d.adminUsers ?? d.admins ?? 0,
          newThisMonth: d.newUsersThisMonth ?? d.newThisMonth ?? 0,
          newThisWeek: d.newUsersThisWeek ?? d.newThisWeek ?? 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers, loadStats]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '' });
    setCurrentPage(1);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">User Management</h1>
          <p className="text-slate-400 mt-2">Manage user accounts and permissions</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#2563ff] text-white px-4 py-2 rounded-lg hover:bg-[#1d4fff] transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create User</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Users className="text-blue-400" size={20} />
              <span className="text-sm font-medium text-slate-400">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle className="text-green-400" size={20} />
              <span className="text-sm font-medium text-slate-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.active.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Shield className="text-purple-400" size={20} />
              <span className="text-sm font-medium text-slate-400">Verified</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.verified.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Shield className="text-orange-400" size={20} />
              <span className="text-sm font-medium text-slate-400">Admins</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.admins.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Calendar className="text-green-400" size={20} />
              <span className="text-sm font-medium text-slate-400">This Month</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.newThisMonth.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2">
              <Calendar className="text-blue-400" size={20} />
              <span className="text-sm font-medium text-slate-400">This Week</span>
            </div>
            <p className="text-2xl font-bold text-slate-50 mt-1">{stats.newThisWeek.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-2 text-slate-300"
          >
            <Filter size={20} />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Verification</label>
                <select
                  value={filters.isVerified === undefined ? '' : filters.isVerified.toString()}
                  onChange={(e) => handleFilterChange('isVerified', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Admin Role</label>
                <select
                  value={filters.hasAdminRoles === undefined ? '' : filters.hasAdminRoles.toString()}
                  onChange={(e) => handleFilterChange('hasAdminRoles', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
                >
                  <option value="">All</option>
                  <option value="true">Has Admin Role</option>
                  <option value="false">Regular User</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Users</h2>
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">{selectedUsers.length} selected</span>
                <button className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563ff] mx-auto"></div>
            <p className="text-slate-400 mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUsers.length === users.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-600 text-[#2563ff] focus:ring-[#2563ff] bg-slate-800"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded border-slate-600 text-[#2563ff] focus:ring-[#2563ff] bg-slate-800"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#2563ff] rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-100">{user.name || 'No name'}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isVerified && (
                          <CheckCircle className="text-green-400" size={16} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.adminRoles.length > 0 ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {user.adminRoles[0].role}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-100">
                        {user._count.projects} projects, {user._count.thumbnails} thumbnails
                      </div>
                      <div className="text-sm text-slate-500">
                        Last login: {formatDate(user.lastLoginAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-700 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-700 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;