import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Check, AlertTriangle, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '../services/api.js';

export default function StockManagement({ user, onNavigate, initialItemId }) {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [itemId, setItemId] = useState(initialItemId ? initialItemId.toString() : '');
  const [adjustmentType, setAdjustmentType] = useState(user.role === 'Teacher' ? 'Out' : 'In');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialItemId && items.length > 0) {
      setItemId(initialItemId.toString());
    }
  }, [initialItemId, items]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, historyRes] = await Promise.all([
        api.inventory.list(),
        api.stock.history()
      ]);
      setItems(itemsRes);
      setHistory(historyRes);

      // Pre-select first item if no item selected yet
      if (!itemId && itemsRes.length > 0) {
        setItemId(itemsRes[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching stock information:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!itemId || !quantity || quantity <= 0) {
      setError('Select a valid catalog item and enter a positive quantity.');
      return;
    }

    if (!reason || !reason.trim()) {
      setError('Please provide a mandatory Reason or Details for this adjustment for auditing records.');
      return;
    }

    const selectedItem = items.find(i => i.id === parseInt(itemId));
    if (!selectedItem) {
      setError('Item no longer exists in database index.');
      return;
    }

    if (adjustmentType === 'Out' && selectedItem.quantity < quantity) {
      setError(`Over-checkout: you are attempting to withdraw ${quantity} units, but only ${selectedItem.quantity} are in storage.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        itemId: parseInt(itemId),
        quantity,
        reason: reason.trim() || (adjustmentType === 'In' ? 'Stock reconciliation check-in' : 'Teacher classroom check-out')
      };

      if (adjustmentType === 'In') {
        await api.stock.checkIn(payload);
        setSuccess(`Stock updated! Verified +${quantity} pieces check-in successful.`);
      } else {
        await api.stock.checkOut(payload);
        setSuccess(`Stock updated! Verified -${quantity} pieces checkout successful.`);
      }

      setQuantity(1);
      setReason('');
      
      // Refresh Lists
      await fetchData();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Stock amendment failure:', err);
      setError(err.response?.data?.error || 'Failed to submit stock adjustment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock & Checkout Controls</h2>
        <p className="text-slate-500 text-sm mt-0.5">Increment inventory or checkout learning modules for lesson activities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Post adjustment Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            <span>Perform Quantity Adjustment</span>
          </h3>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
            {/* Item Selection Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Catalog Material *</label>
              {loading ? (
                <div className="py-2 text-xs text-slate-400">Loading catalog items...</div>
              ) : (
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-white font-medium"
                >
                  <option value="">Select an Item...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku}) — [{i.quantity} psc available]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* In / Out Radio Switch Tab */}
            {user.role !== 'Teacher' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adjustment Direction</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-150">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('In')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      adjustmentType === 'In'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Stock IN (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('Out')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      adjustmentType === 'Out'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                    <span>Stock OUT (-)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adjustment Direction</label>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2">
                  <ArrowDownCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-rose-750">Classroom Checkout Mode Only</span>
                </div>
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity (Units) *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-bold"
              />
            </div>

            {/* Purpose or notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason / Details <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Handout toys for Room C toddlers, supply replenishing (Required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Specify purpose for audit reference (mandatory)</span>
            </div>

            {/* Error & Success States */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-650 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-1.5 font-semibold">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl tracking-wider shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
            >
              {saving ? 'Processing...' : 'Confirm stock ledger update'}
            </button>

          </form>
        </div>

        {/* Right Side: Ledger Movement History Table */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Inventory Ledger Ledger Logs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological list of checkout and storage inputs</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">Refreshing ledger audits...</div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">No transaction history found on this server.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Date</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider font-sans">Material SKU / Name</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Delta</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Staff member</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Action detail / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(m => {
                    const formattedDate = new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/25 transition-colors text-xs">
                        <td className="p-3 font-medium text-slate-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{m.itemName}</div>
                          <div className="font-mono text-[10px] text-slate-450 mt-0.5">{m.itemSku}</div>
                        </td>
                        <td className="p-3">
                          {m.type === 'In' ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md">
                              +{m.quantity} pcs
                            </span>
                          ) : (
                            <span className="font-bold text-rose-700 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded-md">
                              -{m.quantity} pcs
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">
                          @{m.username || 'System'}
                        </td>
                        <td className="p-3 text-slate-500 max-w-[200px] truncate" title={m.reason}>
                          {m.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
