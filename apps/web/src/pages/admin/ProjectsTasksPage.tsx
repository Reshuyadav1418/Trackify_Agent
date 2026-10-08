import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectsApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  getTasksApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from '../../api/services';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorAlert } from '../../components/ErrorAlert';
import { EmptyState } from '../../components/EmptyState';
import { FolderKanban, CheckSquare, Plus, Edit2, Trash2, X } from 'lucide-react';

export const ProjectsTasksPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const [showProjModal, setShowProjModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingProj, setEditingProj] = useState<any | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Project state
  const [projName, setProjName] = useState('');
  const [projClientName, setProjClientName] = useState('');
  const [projDescription, setProjDescription] = useState('');

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');

  const { data: projectsData, isLoading: projsLoading, error: projsError } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjectsApi,
  });

  const { data: tasksData, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasksApi,
  });

  // Project mutations
  const createProjMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetProjForm();
    },
  });

  const updateProjMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProjectApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetProjForm();
    },
  });

  const deleteProjMutation = useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: createTaskApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetTaskForm();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTaskApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetTaskForm();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const resetProjForm = () => {
    setProjName('');
    setProjClientName('');
    setProjDescription('');
    setEditingProj(null);
    setShowProjModal(false);
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskProjectId('');
    setEditingTask(null);
    setShowTaskModal(false);
  };

  const handleEditProj = (p: any) => {
    setEditingProj(p);
    setProjName(p.name);
    setProjClientName(p.clientName || '');
    setProjDescription(p.description || '');
    setShowProjModal(true);
  };

  const handleEditTask = (t: any) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDescription(t.description || '');
    setTaskProjectId(t.projectId?._id || t.projectId || '');
    setShowTaskModal(true);
  };

  const submitProjForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProj) {
      updateProjMutation.mutate({
        id: editingProj._id,
        data: { name: projName, clientName: projClientName, description: projDescription },
      });
    } else {
      createProjMutation.mutate({
        name: projName,
        clientName: projClientName,
        description: projDescription,
        status: 'active',
      });
    }
  };

  const submitTaskForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask._id,
        data: { title: taskTitle, description: taskDescription, projectId: taskProjectId },
      });
    } else {
      createTaskMutation.mutate({
        title: taskTitle,
        description: taskDescription,
        projectId: taskProjectId,
        status: 'todo',
      });
    }
  };


  const isLoading = projsLoading || tasksLoading;
  const error = projsError || tasksError;

  if (isLoading) return <LoadingSpinner label="Loading projects & tasks..." />;
  if (error) return <ErrorAlert message={(error as Error).message} />;

  const projects = projectsData?.projects || [];
  const tasks = tasksData?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Projects & Tasks</h1>
          <p className="page-subtitle">Manage company projects, client assignments, and task definitions.</p>
        </div>

        <div>
          {activeTab === 'projects' ? (
            <button
              onClick={() => {
                resetProjForm();
                setShowProjModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          ) : (
            <button
              onClick={() => {
                resetTaskForm();
                setShowTaskModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'projects'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Tasks ({tasks.length})
        </button>
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="card-panel !p-0 overflow-hidden">
          {projects.length === 0 ? (
            <EmptyState title="No Projects Found" message="Create your first project using the Create Project button." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th>Description</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p: any) => (
                    <tr key={p._id}>
                      <td className="font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-indigo-500" />
                          {p.name}
                        </div>
                      </td>
                      <td className="text-[var(--text-secondary)]">{p.clientName || 'N/A'}</td>
                      <td className="text-[var(--text-muted)] max-w-xs truncate">{p.description || 'No description'}</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleEditProj(p)}
                          className="p-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors"
                          title="Edit Project"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProjMutation.mutate(p._id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                          title="Delete Project"
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

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="card-panel !p-0 overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState title="No Tasks Found" message="Create your first task using the Create Task button." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Project</th>
                    <th>Description</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t: any) => (
                    <tr key={t._id}>
                      <td className="font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                          {t.title}
                        </div>
                      </td>
                      <td className="text-[var(--text-secondary)]">{t.projectId?.name || 'Unassigned'}</td>
                      <td className="text-[var(--text-muted)] max-w-xs truncate">{t.description || 'No description'}</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleEditTask(t)}
                          className="p-1.5 rounded-lg bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTaskMutation.mutate(t._id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                          title="Delete Task"
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

      {/* Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{editingProj ? 'Edit Project' : 'Create Project'}</h3>
              <button onClick={resetProjForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitProjForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Client Name</label>
                <input
                  type="text"
                  value={projClientName}
                  onChange={(e) => setProjClientName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  value={projDescription}
                  onChange={(e) => setProjDescription(e.target.value)}
                  className="input-custom w-full resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetProjForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjMutation.isPending || updateProjMutation.isPending}
                  className="btn-primary"
                >
                  {editingProj ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{editingTask ? 'Edit Task' : 'Create Task'}</h3>
              <button onClick={resetTaskForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitTaskForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Assign to Project</label>
                <select
                  required
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="input-custom w-full"
                >
                  <option value="">Select Project</option>
                  {projects.map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="input-custom w-full resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetTaskForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  className="btn-primary"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTasksPage;

