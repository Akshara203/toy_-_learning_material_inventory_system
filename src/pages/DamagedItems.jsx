import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, AlertTriangle, Hammer, XCircle, Info } from 'lucide-react';
import { api } from '../services/api.js';

export default function DamagedItems({ user, onNavigate }) {
  const [items, setItems] = useState([]);
  const [damagedList, setDamagedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canResolve = user.role === 'Admin' || user.role === 'Store Manager';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, damagedRes] = await Promise.all([
        api.inventory.list(),
        api.damage.list()
      ]);
      setItems(itemsRes);
      setDamagedList(damagedRes);

      // Default select
      if (itemsRes.length > 0 && !itemId) {
        setItemId(itemsRes[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching damaged items list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportDamage = async (e) => {
    e.preventDefault();
    if (!itemId || !quantity || quantity <= 0) {
      setError('Select a valid material and specify a positive quantity of reported damages.');
      return;
    }

    const selectedItem = items.find(i => i.id === parseInt(itemId));
    if (!selectedItem) {
      setError('Selected classroom material no longer exists.');
      return;
    }

    if (selectedItem.quantity < quantity) {
      setError(`Over-report: you cannot report ${quantity} damaged units because there are only ${selectedItem.quantity} units currently available in stock.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.damage.report({
        itemId: parseInt(itemId),
        quantity,
        notes: notes.trim() || 'Classroom damage reported.'
      });

      setSuccess(`Checked damage report! Reported ${quantity} units. Stock levels reduced.`);
      setQuantity(1);
      setNotes('');
      
      // Refresh Lists
      await fetchData();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Damage submission error:', err);
      setError(err.response?.data?.error || 'Failed to file damage report.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setError(null);
      setSuccess(null);
      await api.damage.updateStatus(id, status);
      setSuccess(`Damage record ID #${id} updated to: ${status}`);
      fetchData();
      setTimeout(() => {
        setSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Status change error:', err);
      setError(err.response?.data?.error || 'Failed to update damage status.');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Damaged Items & Repairs</h2>
        <p className="text-slate-500 text-sm mt-0.5">Report toys broken by kids, manage repairs, and track discarded items</p>
      </div>

      {/* Global alert feedback messages */}
      {(error || success) && (
        <div className="space-y-3">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4.5 h-4.5 text-red-650 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-2 font-semibold">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: File a report form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-indigo-600" />
            <span>File New Damage Report</span>
          </h3>

          <form onSubmit={handleReportDamage} className="space-y-4">
            {/* Item Selection Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Damaged Item *</label>
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
                      {i.name} ({i.sku}) — [{i.quantity} in stock]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Damaged Quantity (Units) *</label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-bold"
              />
            </div>

            {/* Explanation Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Explain Damage / Condition</label>
              <textarea
                placeholder="e.g. Clay set missing container lid, toddler ripped book spine page 4."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 h-20 resize-none font-medium"
              />
            </div>

            {/* Information warning box */}
            <div className="bg-amber-50/75 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-850">
              <Info className="w-4.5 h-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] leading-relaxed font-medium">
                <strong>Inventory Notice:</strong> Reporting items as damaged immediately decrements their active classroom quantity and audits the checkout logs automatically to maintain accurate books.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl tracking-wider shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
            >
              {saving ? 'Registering...' : 'Register damage on books'}
            </button>

          </form>
        </div>

        {/* Right Side: Damage log auditing timeline and repairs */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-indigo-600" />
              <span>Reported Damage Registers</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Track items currently undergoing repair or scheduled for recycling</p>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">Retrieving details...</div>
          ) : damagedList.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-250 rounded-2xl text-slate-400 text-xs">No active damaged items registered. High five to the children!</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Date</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Material Name</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Quantity</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Reporter Notes / Details</th>
                    <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Status</th>
                    {canResolve && <th className="p-3 text-xs font-bold text-slate-600 tracking-wider text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {damagedList.map(item => {
                    const format = new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/25 transition-colors text-xs">
                        <td className="p-3 font-medium text-slate-500">
                          {format}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{item.itemName}</div>
                          <div className="font-mono text-[9px] text-slate-450 mt-0.5">{item.itemSku}</div>
                        </td>
                        <td className="p-3 font-bold text-rose-600">
                          {item.quantity} pcs
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs">
                          <div className="truncate" title={item.notes}>{item.notes}</div>
                          <div className="text-[10px] text-indigo-500 italic mt-0.5">Reported by: @{item.reporterName}</div>
                        </td>
                        <td className="p-3">
                          {item.status === 'Reported' && (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 rounded-md">
                              Reported
                            </span>
                          )}
                          {item.status === 'Repaired' && (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-md">
                              Repaired & Checked In
                            </span>
                          )}
                          {item.status === 'Discarded' && (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-500 rounded-md">
                              Discarded / Loss
                            </span>
                          )}
                        </td>
                        {/* Manage repair buttons */}
                        {canResolve && (
                          <td className="p-3 text-right">
                            {item.status === 'Reported' ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleStatusChange(item.id, 'Repaired')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                                  title="Item repaired, return to library stock!"
                                >
                                  <Hammer className="w-3 h-3" />
                                  <span>Repaired</span>
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item.id, 'Discarded')}
                                  className="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                                  title="Unrecoverable snap. Discard and record loss"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Discard</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Resolved</span>
                            )}
                          </td>
                        )}
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
