import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, ChevronLeft, Download, Library as LibraryIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { SettingsDialog } from './SettingsDialog';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isHome && (
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              EPS Tracker
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <Link 
              to="/" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                isHome ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Tableau de bord
            </Link>
            <Link 
              to="/library" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                location.pathname.startsWith('/library') ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <LibraryIcon className="w-4 h-4" />
              Banque
            </Link>
            <Link 
              to="/import" 
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                location.pathname === '/import' ? "text-emerald-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Download className="w-4 h-4" />
              Importer
            </Link>
            <div className="w-px h-4 bg-slate-200 mx-2"></div>
            <SettingsDialog />
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
