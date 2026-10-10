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

      {/* Neumorphic Segmented Tabs */}
      <div className="inline-flex p-1.5 neu-inset rounded-2xl gap-2">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'projects'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <FolderKanban size={15} />
          <span>Projects</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'projects' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            {projects.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-none ${
            activeTab === 'tasks'
              ? 'neu-raised text-neu-accent shadow-neu-raised-sm'
              : 'bg-transparent text-neu-muted hover:text-neu-primary'
          }`}
        >
          <CheckSquare size={15} />
          <span>Tasks</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'tasks' ? 'neu-inset-sm text-neu-accent' : 'neu-inset-sm text-neu-muted'}`}>
            {tasks.length}
          </span>
        </button>
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="table-custom-wrapper">
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
                      <td className="font-bold text-neu-primary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-neu-accent">
                            <FolderKanban size={14} />
                          </div>
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="text-neu-secondary font-medium">{p.clientName || 'N/A'}</td>
                      <td className="text-neu-muted max-w-xs truncate">{p.description || 'No description'}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleEditProj(p)}
                            className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-accent"
                            title="Edit Project"
                            aria-label="Edit Project"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteProjMutation.mutate(p._id)}
                            className="btn-icon-circle w-8 h-8 text-rose-500 hover:text-rose-600"
                            title="Delete Project"
                            aria-label="Delete Project"
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

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="table-custom-wrapper">
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
                      <td className="font-bold text-neu-primary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-emerald-500">
                            <CheckSquare size={14} />
                          </div>
                          <span>{t.title}</span>
                        </div>
                      </td>
                      <td className="text-neu-secondary font-medium">{t.projectId?.name || 'Unassigned'}</td>
                      <td className="text-neu-muted max-w-xs truncate">{t.description || 'No description'}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleEditTask(t)}
                            className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-accent"
                            title="Edit Task"
                            aria-label="Edit Task"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteTaskMutation.mutate(t._id)}
                            className="btn-icon-circle w-8 h-8 text-rose-500 hover:text-rose-600"
                            title="Delete Task"
                            aria-label="Delete Task"
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

      {/* Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="neu-modal-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-neu-primary m-0">
                {editingProj ? 'Edit Project' : 'Create Project'}
              </h3>
              <button
                onClick={resetProjForm}
                className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitProjForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Client Name</label>
                <input
                  type="text"
                  value={projClientName}
                  onChange={(e) => setProjClientName(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Description</label>
                <textarea
                  rows={3}
                  value={projDescription}
                  onChange={(e) => setProjDescription(e.target.value)}
                  className="input-custom w-full resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="neu-modal-card max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-neu-primary m-0">
                {editingTask ? 'Edit Task' : 'Create Task'}
              </h3>
              <button
                onClick={resetTaskForm}
                className="btn-icon-circle w-8 h-8 text-neu-muted hover:text-neu-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitTaskForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="input-custom w-full"
                />
              </div>
              <div>
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Assign to Project</label>
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
                <label className="block text-neu-muted mb-1.5 font-bold uppercase tracking-wider text-[11px]">Description</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="input-custom w-full resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/5">
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
