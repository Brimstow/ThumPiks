import React, { useState, useEffect, useCallback } from 'react';
import { adminRoleService } from '../../services/admin';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  X,
  Crown,
  Lock,
  Unlock
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  lastActive: Date;
  status: 'active' | 'inactive' | 'suspended';
}

const RolePermissionManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<Partial<Role>>({});

  const loadRolesData = useCallback(async () => {
    try {
      const result = await adminRoleService.getRoles();
      if (result.success && result.data) {
        const d = result.data as any;
        if (d.permissions) setPermissions(d.permissions);
        if (d.roles) setRoles(d.roles);
        if (d.users) {
          setUsers((d.users as any[]).map((u: any) => ({
            ...u,
            lastActive: new Date(u.lastActive),
          })));
        }
      }
    } catch (error) {
      console.error('Error loading roles data:', error);
    }
  }, []);

  useEffect(() => {
    loadRolesData();
  }, [loadRolesData]);

  const handleCreateRole = () => {
    setNewRole({ name: '', description: '', permissions: [], color: 'bg-blue-500' });
    setIsEditingRole(true);
  };

  const handleSaveRole = () => {
    if (newRole.name && newRole.description) {
      const role: Role = {
        id: newRole.id || `role_${Date.now()}`,
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions || [],
        userCount: 0,
        isSystemRole: false,
        color: newRole.color || 'bg-blue-500'
      };

      if (newRole.id) {
        setRoles(prev => prev.map(r => r.id === role.id ? role : r));
      } else {
        setRoles(prev => [...prev, role]);
      }

      setIsEditingRole(false);
      setNewRole({});
    }
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }
  };

  const togglePermission = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions?.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...(prev.permissions || []), permissionId]
    }));
  };

  const permissionCategories = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) acc[permission.category] = [];
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          Role & Permission Management
        </h1>
        <p className="text-slate-400 font-medium">Manage user roles, permissions, and access control</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2 mb-8 inline-flex">
        {[
          { id: 'roles', label: 'Roles', icon: Shield },
          { id: 'permissions', label: 'Permissions', icon: Lock },
          { id: 'users', label: 'User Assignments', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#2563ff] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-[#2563ff] bg-slate-900/80 text-slate-100 placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleCreateRole}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563ff] text-white rounded-xl font-semibold hover:bg-[#1d4fff] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.filter(role => 
              role.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(role => (
              <div key={role.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${role.color}`} />
                    <h3 className="text-xl font-bold text-slate-50">{role.name}</h3>
                    {role.isSystemRole && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewRole(role);
                        setIsEditingRole(true);
                      }}
                      className="p-2 text-[#2563ff] hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!role.isSystemRole && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-400 mb-4">{role.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Users</span>
                    <span className="font-semibold text-slate-100">{role.userCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Permissions</span>
                    <span className="font-semibold text-slate-100">{role.permissions.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {Object.entries(permissionCategories).map(([category, perms]) => (
            <div key={category} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-50 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perms.map(permission => (
                  <div key={permission.id} className="p-4 rounded-2xl border border-slate-700 hover:border-[#2563ff]/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Lock className="w-4 h-4 text-[#2563ff]" />
                      <h4 className="font-semibold text-slate-50">{permission.name}</h4>
                    </div>
                    <p className="text-sm text-slate-400">{permission.description}</p>
                    <div className="mt-2 text-xs text-slate-500 font-mono">{permission.id}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Edit Modal */}
      {isEditingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-50">
                {newRole.id ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button
                onClick={() => setIsEditingRole(false)}
                className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name || ''}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff]"
                    placeholder="Enter role name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                  <textarea
                    value={newRole.description || ''}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff] h-24"
                    placeholder="Enter role description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Color</label>
                  <div className="flex gap-2">
                    {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-pink-500'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewRole(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full ${color} ${
                          newRole.color === color ? 'ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-900' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-4">Permissions</label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(permissionCategories).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-slate-50 mb-2">{category}</h4>
                      <div className="space-y-2 ml-4">
                        {perms.map(permission => (
                          <label key={permission.id} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRole.permissions?.includes(permission.id) || false}
                              onChange={() => togglePermission(permission.id)}
                              className="rounded border-slate-600 text-[#2563ff] focus:ring-[#2563ff] bg-slate-800"
                            />
                            <div>
                              <div className="text-sm font-medium text-slate-100">{permission.name}</div>
                              <div className="text-xs text-slate-500">{permission.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8">
              <button
                onClick={() => setIsEditingRole(false)}
                className="px-6 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="px-6 py-2 bg-[#2563ff] text-white rounded-xl font-semibold hover:bg-[#1d4fff] transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissionManagement;