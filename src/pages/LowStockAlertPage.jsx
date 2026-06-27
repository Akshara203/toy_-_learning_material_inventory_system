import React, { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle, PlusCircle, ShoppingBag, ShieldAlert, ArrowLeftRight, Check } from 'lucide-react';
import { api } from '../services/api.js';

export default function LowStockAlertPage({ user, onNavigate }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick replenish state
  const [replenishItem, setReplenishItem] = useState(null);
  const [quantity, setQuantity] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getSummary();
      setAlerts(res.activeAlerts);
    } catch (err) {
      console.error('Error fetching reorder alert lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReplenish = async (e) => {
    e.preventDefault();
    if (!replenishItem || quantity <= 0) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.stock.checkIn({
        itemId: replenishItem.itemId,
        quantity,
        reason: `Reorder Replenishment: purchased from ${replenishItem.supplier || 'Vendor'}`
      });

      setSuccessMsg(`Replenished +${quantity} units of ${replenishItem.itemName}! Warning cleared.`);
      setQuantity(10);
      
      // Reload alerts
      await fetchAlerts();

      setTimeout(() => {
        setSuccessMsg(null);
        setReplenishItem(null);
      }, 1500);

    } catch (err) {
      console.error('Quick replenish failed:', err);
      setErrorMsg(err.response?.data?.error || 'Replenishment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Active Low Stock Alerts</h2>
          <p className="text-slate-500 text-sm mt-0.5">Automated prompts for tools and toys currently beneath critical safety levels</p>
        </div>
        <button
          onClick={() => onNavigate('/inventory')}
          className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-200 rounded-xl transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Go to Catalog</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Checking center catalog safety reserves...</p>
        </div>
      ) : alerts.length === 0 ? (
        /* Zero alert state */
        <div className="max-w-xl mx-auto py-16 px-8 text-center bg-emerald-50/25 border border-dashed border-emerald-200 rounded-2xl flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-950">Storage Healthy & Stocked!</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            All toys, worksheets, pencils and textbooks are fully stocked above safety threshold requirements. No reorders needed today.
          </p>
        </div>
      ) : (
        /* Alerts list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between hover:border-red-200 transition-all"
            >
              <div>
                {/* Warning row */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg self-start text-[10px] font-bold tracking-wide uppercase leading-none">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Low Stock Warning</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{alert.itemName}</h3>
                <span className="text-xs font-mono text-slate-400 block mt-0.5">SKU: {alert.itemSku}</span>

                <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">Active Stock</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">{alert.quantity} units</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Safety Min</span>
                    <p className="text-lg font-black text-slate-800 mt-0.5">{alert.minRequired} units</p>
                  </div>
                </div>

                {/* Locations and supplier specifications */}
                <div className="mt-4 space-y-1.5 text-xs font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Storage Coordinates:</span>
                    <span>{alert.location || 'Not designated'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Contract Supplier:</span>
                    <span>{alert.supplier || 'Local Acquisition'}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => onNavigate(`/stock?itemId=${alert.itemId}`)}
                  className={`flex items-center justify-center gap-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                    user.role === 'Teacher' ? 'w-full' : 'flex-1'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>{user.role === 'Teacher' ? 'Request Checkout / Adjust' : 'Manual Ledger'}</span>
                </button>
                {user.role !== 'Teacher' && (
                  <button
                    onClick={() => setReplenishItem(alert)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl tracking-wide transition-all shadow-md shadow-red-600/10 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Replenish Supplies</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Quick check-in drawer/modal */}
      {replenishItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 border border-slate-100 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <span>Purchase Order Check-In</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add restock units of <span className="font-semibold text-slate-800">{replenishItem.itemName}</span> to clear this low safety threshold.
            </p>

            <form onSubmit={handleQuickReplenish} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivered quantity (Units)</label>
                <input
                  type="number"
                  required
                  min={5}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 font-black text-slate-900"
                />
              </div>

              <div className="text-xs font-bold bg-slate-50 p-2.5 rounded-lg text-slate-600">
                <span className="text-[10px] text-slate-400 block mb-0.5">Post Restock Forecast:</span>
                <span>Pre-stock is {replenishItem.quantity} pcs. Post balance will be <strong className="text-emerald-700">{replenishItem.quantity + quantity}</strong> units.</span>
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-150 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReplenishItem(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-150 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-750 rounded-lg cursor-pointer flex items-center gap-0.5"
                >
                  {submitting ? 'Checking in...' : 'Approve Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
