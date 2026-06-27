import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowUpRight, 
  Clock, 
  Activity, 
  PlusCircle, 
  Trash2,
  ListFilter
} from 'lucide-react';
import { api } from '../services/api.js';

export default function Dashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getSummary();
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setError('Could not connect to back-end API. Please inspect connection codes.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Retrieving center overview...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-xl mx-auto mt-10">
        <h3 className="font-bold flex items-center gap-2 text-lg">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          Connection Failure
        </h3>
        <p className="mt-2 text-sm text-red-600">{error || 'Unknown network error. Recalibrating context.'}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-lg transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Greeting row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Toy & Learning Material Inventory</h2>
          <p className="text-slate-500 text-sm mt-1">
            Hello, <span className="font-semibold text-indigo-600">{user.username}</span> ({user.role}). Track toys, activity kits, books, and classroom crafts here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(user.role === 'Admin' || user.role === 'Store Manager') && (
            <button
              onClick={() => onNavigate('/inventory/add')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Material</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('/stock')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 transition-colors text-white font-medium text-xs rounded-xl shadow-md shadow-slate-800/10 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>Adjust Quantities</span>
          </button>
        </div>
      </div>

      {/* Numerical Stats boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Unique Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Unique Items</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 leading-none">{data.totalUniqueItems}</h3>
            <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider mt-1.5 block cursor-pointer hover:underline" onClick={() => onNavigate('/inventory')}>
              Browse items
            </span>
          </div>
        </div>

        {/* Total Available Stocks */}
        <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">Active Stock</span>
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-emerald-600 leading-none">{data.availableStock}</h3>
            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mt-1.5 block">
              Units in storage
            </span>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Low Stock</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 leading-none">{data.lowStockCount}</h3>
            <span 
              className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mt-1.5 block cursor-pointer hover:underline"
              onClick={() => onNavigate('/alerts')}
            >
              Needs reorder
            </span>
          </div>
        </div>

        {/* Damaged items reported */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Damaged items</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 leading-none">{data.activeDamagedCount}</h3>
            <span 
              className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider mt-1.5 block cursor-pointer hover:underline"
              onClick={() => onNavigate('/damage')}
            >
              Damaged total
            </span>
          </div>
        </div>

        {/* Movements count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Today updates</span>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 leading-none">{data.todaysMovementsCount}</h3>
            <span className="text-[10px] text-sky-600 font-semibold uppercase tracking-wider mt-1.5 block">
              Stock movements
            </span>
          </div>
        </div>

        {/* Total Active Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Alerts count</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 leading-none">{data.activeAlerts.length}</h3>
            <span 
              className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider mt-1.5 block cursor-pointer hover:underline"
              onClick={() => onNavigate('/alerts')}
            >
              Active flags
            </span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Active Low Stock Alerts Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Urgent Reorder Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tactile kits and craft tools below safety thresholds</p>
            </div>
            <button
              onClick={() => onNavigate('/alerts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Manage alerts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.activeAlerts.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl bg-emerald-50/25 text-center flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">All Supplies in Healthy Stock</h4>
              <p className="text-xs text-slate-500 max-w-sm">No materials are currently registered below their safe min-required quantities.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Item Details</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Stock</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Safety Min</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.activeAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">{alert.itemName}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">{alert.itemSku}</div>
                      </td>
                      <td className="p-3 font-semibold text-rose-600">
                        {alert.quantity} units
                      </td>
                      <td className="p-3 text-slate-500">
                        {alert.minRequired} required
                      </td>
                      <td className="p-3 text-xs text-slate-600 font-medium">
                        {alert.location || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Activity Audit Timeline */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">System Activity Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time audit trailing of inventory modifications</p>
          </div>

          <div className="flow-root">
            <ul className="-mb-8">
              {data.recentLogs.map((log, index) => {
                const dateText = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateFormatted = new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                return (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {index !== data.recentLogs.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm text-xs">
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-xs font-semibold text-slate-800">
                            {log.action} <span className="font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px]">{log.username || 'System'}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                            {dateFormatted} at {dateText}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
