import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import {
  Search,
  Clock,
  Calendar,
  Image as ImageIcon,
  FileEdit,
  BarChart3,
  FolderKanban,
  Users,
  LogOut,
  Smartphone,
  ChevronDown,
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (!user) return [];

    if (user.role === 'admin') {
      return [
        { label: 'Users & Teams', path: '/admin/users-teams', icon: Users },
        { label: 'Projects & Tasks', path: '/admin/projects-tasks', icon: FolderKanban },
        { label: 'Policy Settings', path: '/admin/policies', icon: Shield },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
        { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
      ];
    }

    if (user.role === 'manager') {
      return [
        { label: 'Team Overview', path: '/manager/team', icon: Users },
        { label: 'Activity Charts', path: '/manager/activity', icon: BarChart3 },
        { label: 'Screenshot Review', path: '/manager/screenshots', icon: ImageIcon },
      ];
    }

    // Employee
    return [
      { label: 'Summary', path: '/', icon: Clock },
      { label: 'Timelines & Timesheets', path: '/timesheet', icon: Calendar },
      { label: 'Screenshots Gallery', path: '/screenshots', icon: ImageIcon },
      { label: 'Edit Time Request', path: '/manual-entry', icon: FileEdit },
    ];
  };

  const navLinks = getNavLinks().filter((link) =>
    link.label.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const currentNav = getNavLinks().find((l) =>
    l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path)
  );

  return (
    <div className="flex min-h-screen bg-neu-bg text-neu-primary">
      {/* Sidebar Desktop */}
      <aside className="w-64 fixed top-0 bottom-0 left-0 z-40 flex flex-col p-4 bg-neu-bg">
        <div className="flex-1 flex flex-col neu-raised rounded-3xl p-3 overflow-hidden">
          {/* Brand Header */}
          <div className="p-3 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-raised-sm flex items-center justify-center text-neu-accent font-black text-base shadow-neu-raised-sm">
              T
            </div>
            <div>
              <h1 className="text-lg font-extrabold m-0 tracking-tight text-neu-primary leading-tight">
                Trackify
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neu-muted">
                {user?.role || 'Workspace'}
              </span>
            </div>
          </div>

          {/* Search Menu */}
          <div className="px-1 py-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-neu-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Filter menu..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs neu-inset-sm rounded-xl"
              />
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-1 py-2 flex flex-col gap-2 overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.path + link.label}
                  to={link.path}
                  end={link.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 no-underline ${
                      isActive
                        ? 'neu-inset text-neu-accent shadow-neu-inset-sm font-extrabold'
                        : 'text-neu-secondary hover:neu-raised-sm hover:text-neu-primary'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          isActive ? 'text-neu-accent' : 'text-neu-muted'
                        }`}
                      >
                        <Icon size={17} />
                      </div>
                      <span className="truncate">{link.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer User Badge */}
          <div className="p-2 pt-3 border-t border-white/10 dark:border-white/5">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-bold text-neu-muted">Teamlogger v0.1</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title="System Online" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content & Top Bar Area */}
      <div className="ml-64 flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-18 sticky top-0 z-30 flex items-center justify-between px-8 bg-neu-bg">
          {/* Breadcrumbs & Search */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-neu-muted">
              <span>Admin</span>
              <ChevronRight size={13} />
              <span className="text-neu-primary font-extrabold">{currentNav?.label || 'Overview'}</span>
            </div>

            <div className="relative w-64 md:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neu-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search resources, users..."
                className="w-full pl-10 pr-4 py-2 text-xs neu-inset-sm rounded-xl"
              />
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-4">
            {/* Mobile App Button */}
            <button
              type="button"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Smartphone size={14} className="text-neu-accent" />
              <span>Mobile app</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl neu-raised-sm cursor-pointer border-none bg-transparent"
              >
                <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center font-bold text-neu-accent text-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold m-0 text-neu-primary leading-tight">{user?.name || 'User'}</p>
                  <p className="text-[10px] font-medium m-0 text-neu-muted truncate max-w-[100px]">{user?.role || 'Admin'}</p>
                </div>
                <ChevronDown size={14} className="text-neu-muted" />
              </button>

              {userDropdownOpen && (
                <div className="neu-dropdown absolute right-0 top-full mt-2 w-48 z-50 p-2">
                  <div className="px-3 py-2 border-b border-white/10 dark:border-white/5 mb-1">
                    <p className="text-xs font-bold text-neu-primary m-0 truncate">{user?.name}</p>
                    <p className="text-[10px] text-neu-muted m-0 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 rounded-xl hover:neu-inset-sm transition-all text-left"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
