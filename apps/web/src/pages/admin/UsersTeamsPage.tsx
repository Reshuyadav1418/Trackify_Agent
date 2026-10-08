import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  getTeamsApi,
  createTeamApi,
  updateTeamApi,
  deleteTeamApi,
} from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { UserPlus, Trash2, Edit2, Plus, X } from 'lucide-react';


export const UsersTeamsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  // User form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [userTeamId, setUserTeamId] = useState('');

  // Team form state
  const [teamName, setTeamName] = useState('');
  const [teamManagerId, setTeamManagerId] = useState('');

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });

  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeamsApi,
  });

  // User Mutations
  const createUserMutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      resetUserForm();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUserApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      resetUserForm();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  // Team Mutations
  const createTeamMutation = useMutation({
    mutationFn: createTeamApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      resetTeamForm();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTeamApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      resetTeamForm();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeamApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('employee');
    setUserTeamId('');
    setEditingUser(null);
    setShowUserModal(false);
  };

  const resetTeamForm = () => {
    setTeamName('');
    setTeamManagerId('');
    setEditingTeam(null);
    setShowTeamModal(false);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserTeamId(user.teamId?._id || user.teamId || '');
    setShowUserModal(true);
  };

  const handleEditTeam = (team: any) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamManagerId(team.managerId?._id || team.managerId || '');
    setShowTeamModal(true);
  };

  const submitUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser._id,
        data: { name: userName, role: userRole, teamId: userTeamId || undefined },
      });
    } else {
      createUserMutation.mutate({
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        teamId: userTeamId || undefined,
      });
    }
  };

  const submitTeamForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      updateTeamMutation.mutate({
        id: editingTeam._id,
        data: { name: teamName, managerId: teamManagerId || undefined },
      });
    } else {
      createTeamMutation.mutate({
        name: teamName,
        managerId: teamManagerId || undefined,
      });
    }
  };

  const isLoading = usersLoading || teamsLoading;
  const error = usersError || teamsError;

  if (isLoading) return <LoadingSpinner label="Loading users & teams..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  const users = usersData?.users || [];
  const teams = teamsData?.teams || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Users & Teams Management</h1>
          <p className="page-subtitle">Provision users, configure roles, and organize team structures.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'users' ? (
            <button
              onClick={() => {
                resetUserForm();
                setShowUserModal(true);
              }}
              className="btn-primary"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          ) : (
            <button
              onClick={() => {
                resetTeamForm();
                setShowTeamModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Create Team
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Teams ({teams.length})
        </button>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="card-panel !p-0 overflow-hidden">
          {users.length === 0 ? (
            <EmptyState title="No Users Found" message="Create your first user using the Add User button above." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u._id}>
                      <td className="font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{u.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                              : u.role === 'manager'
                              ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="text-[var(--text-secondary)]">{u.teamId?.name || 'No Team'}</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUserMutation.mutate(u._id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Teams Tab Content */}
      {activeTab === 'teams' && (
        <div className="card-panel !p-0 overflow-hidden">
          {teams.length === 0 ? (
            <EmptyState title="No Teams Found" message="Create your first team using the Create Team button." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Manager</th>
                    <th>Members Count</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t: any) => (
                    <tr key={t._id}>
                      <td className="font-semibold text-[var(--text-primary)]">{t.name}</td>
                      <td className="text-[var(--text-secondary)]">{t.managerId?.name || 'Unassigned'}</td>
                      <td className="text-[var(--text-muted)]">{t.memberIds?.length || 0} members</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleEditTeam(t)}
                          className="p-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors"
                          title="Edit Team"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTeamMutation.mutate(t._id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Form Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={resetUserForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitUserForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="input-custom w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Password</label>
                    <input
                      type="password"
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="input-custom w-full"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="input-custom w-full"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Assign Team</label>
                <select
                  value={userTeamId}
                  onChange={(e) => setUserTeamId(e.target.value)}
                  className="input-custom w-full"
                >
                  <option value="">No Team</option>
                  {teams.map((t: any) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="btn-primary"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Form Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{editingTeam ? 'Edit Team' : 'Create Team'}</h3>
              <button onClick={resetTeamForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitTeamForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Team Manager</label>
                <select
                  value={teamManagerId}
                  onChange={(e) => setTeamManagerId(e.target.value)}
                  className="input-custom w-full"
                >
                  <option value="">Unassigned</option>
                  {users.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetTeamForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                  className="btn-primary"
                >
                  {editingTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTeamsPage;

