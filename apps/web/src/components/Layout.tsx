import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';


export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Sidebar Desktop */}
      <aside
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            T
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Trackify
          </h1>
        </div>


        {/* Search Menu */}
        <div style={{ padding: '0.75rem 1rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search menu..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.2rem',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-input)',
                borderRadius: '0.5rem',
              }}
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path + link.label}
                to={link.path}
                end={link.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>


      {/* Main Content & Top Bar Area */}
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--bg-topbar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Top Search */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search help — How do I..."
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                fontSize: '0.825rem',
                backgroundColor: 'var(--bg-input)',
                borderRadius: '0.5rem',
              }}
            />
          </div>

          {/* Top Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Support Info */}
            <div style={{ fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>Support +91 70183 18974</p>
              <p style={{ margin: 0, fontSize: '0.7rem' }}>Mon-Fri, 10AM to 6PM IST</p>
            </div>

            {/* Mobile App Button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid #3b82f6',
                color: '#3b82f6',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Smartphone size={15} />
              Mobile app
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
                  <p style={{ fontSize: '0.725rem', margin: 0, color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    padding: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '160px',
                    zIndex: 50,
                  }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '0.5rem',
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '1.75rem', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
