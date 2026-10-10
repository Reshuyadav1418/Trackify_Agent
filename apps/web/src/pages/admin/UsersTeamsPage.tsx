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
import { UserPlus, Trash2, Edit2, Plus, X, Users as UsersIcon, Shield, Briefcase } from 'lucide-react';

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

      {/* Neumorphic Segmented Tabs */}
      <div className="inline-flex p-1.5 neu-inset rounded-2xl gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'users'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <UsersIcon size={15} />
          <span>Users</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'users' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            {users.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'teams'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <Briefcase size={15} />
          <span>Teams</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'teams' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            {teams.length}
          </span>
        </button>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="table-custom-wrapper">
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
                      <td className="font-medium text-neu-primary">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center font-bold text-xs text-neu-accent">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-neu-primary m-0">{u.name}</p>
                            <p className="text-xs text-neu-muted m-0">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            u.role === 'admin'
                              ? 'badge-indigo'
                              : u.role === 'manager'
                              ? 'badge-amber'
                              : 'badge-emerald'
                          }
                        >
                          <Shield size={12} />
                          {u.role}
                        </span>
                      </td>
                      <td className="text-neu-secondary font-medium">{u.teamId?.name || 'No Team'}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-accent"
                            title="Edit User"
                            aria-label="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteUserMutation.mutate(u._id)}
                            className="btn-icon-circle w-8 h-8 text-rose-500 hover:text-rose-600"
                            title="Delete User"
                            aria-label="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
        <div className="table-custom-wrapper">
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
                      <td className="font-bold text-neu-primary">{t.name}</td>
                      <td className="text-neu-secondary font-medium">{t.managerId?.name || 'Unassigned'}</td>
                      <td className="text-neu-muted tabular-nums">{t.memberIds?.length || 0} members</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleEditTeam(t)}
                            className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-accent"
                            title="Edit Team"
                            aria-label="Edit Team"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteTeamMutation.mutate(t._id)}
                            className="btn-icon-circle w-8 h-8 text-rose-500 hover:text-rose-600"
                            title="Delete Team"
                            aria-label="Delete Team"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="neu-modal-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-neu-primary m-0">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={resetUserForm}
                className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitUserForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Full Name</label>
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
                    <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Email Address</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="input-custom w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Password</label>
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
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Role</label>
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
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Assign Team</label>
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

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="neu-modal-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-neu-primary m-0">
                {editingTeam ? 'Edit Team' : 'Create Team'}
              </h3>
              <button
                onClick={resetTeamForm}
                className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitTeamForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>

              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Team Manager</label>
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

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/5">
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
