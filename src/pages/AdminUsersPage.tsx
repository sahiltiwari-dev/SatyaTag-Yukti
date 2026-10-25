import React, { useEffect, useState } from 'react';
import { Shield, UserPlus, Search, RefreshCw } from 'lucide-react';
import { Card, Button } from '../components/common/Button';
import * as platform from '../services/platform';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<platform.UserProfileResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'officer',
    department: 'Department of Consumer Affairs',
    jurisdiction: 'National Capital Region',
    employee_id: '',
    designation: 'Legal Metrology Officer',
    phone: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ email: string; initial_password: string } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await platform.adminListUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) return;
    setCreating(true);
    setError('');
    try {
      const res = await platform.adminCreateUser(formData);
      if (res.initial_password) {
        setCreatedResult({ email: res.email, initial_password: res.initial_password });
      }
      setFormData({
        email: '',
        full_name: '',
        role: 'officer',
        department: 'Department of Consumer Affairs',
        jurisdiction: 'National Capital Region',
        employee_id: '',
        designation: 'Legal Metrology Officer',
        phone: '',
      });
      loadUsers();
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create user account.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (targetId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await platform.adminUpdateUserStatus(targetId, nextStatus);
      loadUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to update status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-govblue-50 text-govblue-600">
              <Shield className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold text-navy-900">Admin User Management</h1>
          </div>
          <p className="text-sm text-slate-500">Securely provision accounts, manage roles, and review authorized personnel.</p>
        </div>
        <Button onClick={() => { setShowModal(true); setCreatedResult(null); }} className="gap-2">
          <UserPlus className="h-4 w-4" /> Create New User
        </Button>
      </div>

      {createdResult && (
        <Card className="border-compliant-300 bg-compliant-50/60 p-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-compliant-900">User Successfully Created!</h3>
            <p className="text-xs text-compliant-800">
              Account created for <span className="font-medium">{createdResult.email}</span>. Initial password:
            </p>
            <div className="mt-2 flex items-center gap-2 rounded bg-white px-3 py-2 font-mono text-xs font-bold text-navy-900 shadow-sm border border-compliant-200">
              <span>Password: {createdResult.initial_password}</span>
              <button
                onClick={() => navigator.clipboard.writeText(createdResult.initial_password)}
                className="ml-auto text-xs text-govblue-600 hover:underline"
              >
                Copy
              </button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-card border border-violation-200 bg-violation-50 p-4 text-xs font-medium text-violation-800">
          {error}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs text-navy-900 placeholder-slate-400 focus:border-govblue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-navy-900 focus:border-govblue-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="officer">Officer</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
            <Button variant="outline" onClick={loadUsers} className="gap-1.5 text-xs py-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy-900">{u.full_name}</div>
                      <div className="text-slate-500 text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{u.role.toUpperCase()}</td>
                    <td className="py-3 px-4">{u.department || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.account_status === 'active' ? 'bg-compliant-100 text-compliant-800' : 'bg-violation-100 text-violation-800'}`}>
                        {u.account_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.account_status)}
                          className="text-govblue-600 hover:underline font-medium"
                        >
                          {u.account_status === 'active' ? 'Disable' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-2xl">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Create User Account</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-xs bg-white"
                >
                  <option value="officer">Enforcement Officer</option>
                  <option value="supervisor">Senior Supervisor</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
