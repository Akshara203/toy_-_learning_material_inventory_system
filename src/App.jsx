import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User as UserIcon, 
  Lock, 
  Package, 
  ShieldAlert, 
  ChevronRight,
  Menu,
  X,
  PlusSquare,
  AlertOctagon,
  LogOut
} from 'lucide-react';
import { api } from './services/api.js';

// Import Pages
import Dashboard from './pages/Dashboard.jsx';
import InventoryList from './pages/InventoryList.jsx';
import AddInventory from './pages/AddInventory.jsx';
import EditInventory from './pages/EditInventory.jsx';
import StockManagement from './pages/StockManagement.jsx';
import DamagedItems from './pages/DamagedItems.jsx';
import LowStockAlertPage from './pages/LowStockAlertPage.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

// Navigation layout
import Navigation from './components/Navigation.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Custom hash-based routing state
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [editingItemId, setEditingItemId] = useState(null);

  // High-level badge updates
  const [lowStockCount, setLowStockCount] = useState(0);

  // Mobile menu control state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login form entries
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    // Monitor URL state
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) || '/dashboard';
      
      // Parse sub-routes (e.g. #/inventory/edit/5)
      if (hash.startsWith('/inventory/edit/')) {
        const id = parseInt(hash.replace('/inventory/edit/', ''));
        if (!isNaN(id)) {
          setEditingItemId(id);
          setCurrentRoute('/inventory/edit/:id');
          return;
        }
      }

      // Read query variables (e.g. #/stock?itemId=5)
      if (hash.startsWith('/stock')) {
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        const itemIdParam = urlParams.get('itemId');
        if (itemIdParam) {
          setEditingItemId(parseInt(itemIdParam));
        } else {
          setEditingItemId(null);
        }
        setCurrentRoute('/stock');
        return;
      }

      setEditingItemId(null);
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Execute immediately on boot
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('preschool_auth_token');
    if (!token) {
      setAuthChecking(false);
      return;
    }

    try {
      const currentUser = await api.auth.getCurrentUser();
      setUser(currentUser);
      fetchBadges();
    } catch (err) {
      console.warn('Stale auth session, resetting locks...');
      localStorage.removeItem('preschool_auth_token');
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const summary = await api.dashboard.getSummary();
      setLowStockCount(summary.lowStockCount);
    } catch (err) {
      // Benign, bypass if offline first
    }
  };

  const handleNavigate = (path) => {
    window.location.hash = path;
    setMobileMenuOpen(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setLoginError('Please type in both your username and password.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.auth.login(usernameInput.trim(), passwordInput);
      
      // Persist token
      localStorage.setItem('preschool_auth_token', res.token);
      setUser(res.user);
      
      // Immediately populate stats
      const summary = await api.dashboard.getSummary();
      setLowStockCount(summary.lowStockCount);

      // Go Home
      handleNavigate('/dashboard');
    } catch (err) {
      const serverErrorMessage = err.response?.data?.error || err.message || 'Invalid credentials. Please retry.';
      console.warn('Auth failure - Server response details:', serverErrorMessage);
      console.warn('Full authorization error context:', err);
      setLoginError(serverErrorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const autofillUser = (username, pass) => {
    setUsernameInput(username);
    setPasswordInput(pass);
    setLoginError(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold tracking-wider mt-4">Verifying session token...</p>
      </div>
    );
  }

  // Not Logged In Screen - Gorgeous high-fidelity visual form
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative transition-colors duration-200">
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo element */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-slate-900 tracking-tight leading-none font-sans">
            Toy & Learning Inventory Console
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500">
            Log in to manage educational materials, tracks defects, and order alerts
          </p>
        </div>

        {/* Form Container */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100 space-y-6">
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Staff Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. director"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium bg-slate-50/10"
                  />
                </div>
              </div>

              {/* Password row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Codes</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium bg-slate-50/10"
                  />
                </div>
              </div>

              {/* Error Box */}
              {loginError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Submit buttons */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-705 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? 'Opening database...' : 'Console Access'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-center text-xs font-bold text-slate-500 mb-2">
                Quick Access Staff Portals
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput('director');
                    setPasswordInput('admin123');
                  }}
                  className="px-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-center cursor-pointer transition-colors"
                >
                  <p className="text-[10px] font-bold text-indigo-600">Admin</p>
                  <p className="text-[9px] text-slate-500">director</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput('miss_emily');
                    setPasswordInput('teacher123');
                  }}
                  className="px-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-center cursor-pointer transition-colors"
                >
                  <p className="text-[10px] font-bold text-indigo-600">Teacher</p>
                  <p className="text-[9px] text-slate-500">miss_emily</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput('store_bob');
                    setPasswordInput('manager123');
                  }}
                  className="px-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-center cursor-pointer transition-colors"
                >
                  <p className="text-[10px] font-bold text-indigo-600">Manager</p>
                  <p className="text-[9px] text-slate-500">store_bob</p>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Active Workspace Framework rendering
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans transition-colors duration-200">
      
      {/* 1. Large Screen Sidebar navigation layout */}
      <div className="hidden lg:block">
        <Navigation 
          user={user} 
          activePath={currentRoute} 
          onNavigate={handleNavigate} 
          lowStockCount={lowStockCount} 
        />
      </div>

      {/* 2. Mobile visual navigation layout drawer bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1E293B] z-40 px-4 border-b border-slate-800 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-white text-xs font-black tracking-wider uppercase">Toy & Material Inventory</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-white hover:bg-slate-800 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile navigation side menu drawer (active on click) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-35 bg-[#1E293B] pt-16 flex flex-col font-sans text-slate-100">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-sm">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{user.username}</p>
              <p className="text-[10px] text-slate-400">{user.role}</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <button onClick={() => handleNavigate('/dashboard')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Dashboard</button>
            <button onClick={() => handleNavigate('/inventory')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Material Inventory</button>
            {(user.role === 'Admin' || user.role === 'Store Manager') && (
              <button onClick={() => handleNavigate('/inventory/add')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Add Material</button>
            )}
            <button onClick={() => handleNavigate('/stock')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Stock Adjustments</button>
            <button onClick={() => handleNavigate('/damage')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Damaged Materials</button>
            <button onClick={() => handleNavigate('/alerts')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block flex justify-between items-center">
              <span>Low Stock Alerts</span>
              {lowStockCount > 0 && <span className="px-2 py-0.5 bg-red-500 rounded-full text-[10px] text-white font-extrabold">{lowStockCount}</span>}
            </button>
            {(user.role === 'Admin' || user.role === 'Store Manager') && (
              <button onClick={() => handleNavigate('/reports')} className="w-full text-left py-3 text-sm border-b border-slate-850 font-bold block">Reports & Audits</button>
            )}
            <button onClick={() => handleNavigate('/profile')} className="w-full text-left py-3 text-sm font-bold block">My Profile Settings</button>
          </div>

          <div className="p-4 border-t border-slate-850 bg-slate-900/40">
            <button 
              onClick={() => {
                localStorage.removeItem('preschool_auth_token');
                window.location.reload();
              }}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-500/25 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Console Session</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main content frame area */}
      <main className="flex-1 min-w-0 min-h-screen lg:ml-64 pt-20 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {currentRoute === '/dashboard' && (
            <Dashboard user={user} onNavigate={handleNavigate} />
          )}
          {currentRoute === '/inventory' && (
            <InventoryList user={user} onNavigate={handleNavigate} />
          )}
          {currentRoute === '/inventory/add' && (
            user.role === 'Admin' || user.role === 'Store Manager' ? (
              <AddInventory user={user} onNavigate={handleNavigate} />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-md mx-auto mt-12">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 font-sans">Access Denied</h3>
                <p className="text-slate-500 text-xs mt-2 font-sans">Your role ({user.role}) is unauthorized to register new assets.</p>
                <button onClick={() => handleNavigate('/dashboard')} className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">Go to Dashboard</button>
              </div>
            )
          )}
          {currentRoute === '/inventory/edit/:id' && editingItemId !== null && (
            user.role === 'Admin' || user.role === 'Store Manager' ? (
              <EditInventory user={user} onNavigate={handleNavigate} itemId={editingItemId} />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-md mx-auto mt-12">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 font-sans">Access Denied</h3>
                <p className="text-slate-500 text-xs mt-2 font-sans">Your role ({user.role}) is unauthorized to edit material specifications.</p>
                <button onClick={() => handleNavigate('/dashboard')} className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">Go to Dashboard</button>
              </div>
            )
          )}
          {currentRoute === '/stock' && (
            <StockManagement user={user} onNavigate={handleNavigate} initialItemId={editingItemId || undefined} />
          )}
          {currentRoute === '/damage' && (
            <DamagedItems user={user} onNavigate={handleNavigate} />
          )}
          {currentRoute === '/alerts' && (
            <LowStockAlertPage user={user} onNavigate={handleNavigate} />
          )}
          {currentRoute === '/reports' && (
            user.role === 'Admin' || user.role === 'Store Manager' ? (
              <Reports />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center max-w-md mx-auto mt-12">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 font-sans">Access Denied</h3>
                <p className="text-slate-500 text-xs mt-2 font-sans">Your role ({user.role}) is unauthorized to view audit ledgers and administrative reports.</p>
                <button onClick={() => handleNavigate('/dashboard')} className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">Go to Dashboard</button>
              </div>
            )
          )}
          {currentRoute === '/profile' && (
            <Profile user={user} onNavigate={handleNavigate} />
          )}
        </div>
      </main>

    </div>
  );
}
