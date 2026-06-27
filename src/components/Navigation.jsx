import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  ArrowLeftRight, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  LogOut, 
  FolderPlus, 
  User,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

export default function Navigation({ user, activePath, onNavigate, lowStockCount }) {
  const isAuthorized = user.role === 'Admin' || user.role === 'Store Manager';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Teacher', 'Store Manager'] },
    { name: 'Material Inventory', path: '/inventory', icon: Package, roles: ['Admin', 'Teacher', 'Store Manager'] },
    { name: 'Add Material', path: '/inventory/add', icon: PlusCircle, roles: ['Admin', 'Store Manager'] },
    { name: 'Stock Adjustments', path: '/stock', icon: ArrowLeftRight, roles: ['Admin', 'Teacher', 'Store Manager'] },
    { name: 'Damaged Materials', path: '/damage', icon: Trash2, roles: ['Admin', 'Teacher', 'Store Manager'] },
    { name: 'Low Stock Alerts', path: '/alerts', icon: AlertOctagon, roles: ['Admin', 'Teacher', 'Store Manager'], badge: lowStockCount },
    { name: 'Reports & Audits', path: '/reports', icon: FileText, roles: ['Admin', 'Store Manager'] },
    { name: 'My Profile', path: '/profile', icon: User, roles: ['Admin', 'Teacher', 'Store Manager'] },
  ];

  const handleLogout = () => {
    localStorage.removeItem('preschool_auth_token');
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-[#1E293B] text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-slate-800 shadow-xl font-sans">
      {/* Brand logo & header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white leading-none">Toy & Learning</h1>
          <span className="text-xs text-indigo-400 font-medium">Inventory Console</span>
        </div>
      </div>

      {/* Profile info section */}
      <div 
        onClick={() => onNavigate('/profile')}
        className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col gap-2 cursor-pointer transition-all hover:bg-slate-900/80 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 group-hover:border-indigo-500 transition-all">
            {user.username.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-all">{user.username}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        
        {/* Role Badge */}
        <div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg self-start">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-semibold text-indigo-300 tracking-wide">{user.role}</span>
        </div>
      </div>

      {/* Nav Link list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const hasAccess = item.roles.includes(user.role);
          if (!hasAccess) return null;

          const isActive = activePath === item.path || (item.path !== '/dashboard' && activePath.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              <span className="flex-1 text-left">{item.name}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors ${
                  isActive ? 'bg-white text-indigo-700' : 'bg-red-500/15 text-red-400 border border-red-500/25'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout triggers */}
      <div className="p-4 border-t border-slate-850 bg-slate-900/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
