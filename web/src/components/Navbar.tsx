import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/dashboard')}
      >
        <span className="text-2xl">⚡</span>
        <span className="text-xl font-bold text-slate-50">Health AI</span>
      </div>

      <div className="flex gap-2">
        <button
          className={`px-4 py-2 bg-transparent border-none rounded-md text-sm cursor-pointer transition-all ${
            isActive('/dashboard')
              ? 'bg-slate-700 text-slate-50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-2 bg-transparent border-none rounded-md text-sm cursor-pointer transition-all ${
            isActive('/devices')
              ? 'bg-slate-700 text-slate-50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
          onClick={() => navigate('/devices')}
        >
          Connected Devices
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user && <span className="text-slate-400 text-sm">{user.full_name}</span>}
        <button
          className="px-4 py-2 bg-red-500 border-none rounded-md text-white text-sm cursor-pointer hover:bg-red-600 transition-colors"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
