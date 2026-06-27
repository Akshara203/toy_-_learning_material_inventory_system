import React, { useState, useEffect } from 'react';
import { Edit, ArrowLeft, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api.js';

export default function EditInventory({ user, onNavigate, itemId }) {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingItem, setLoadingItem] = useState(true);
  const [item, setItem] = useState(null);

  // Form Fields state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [minRequired, setMinRequired] = useState(5);
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchInitialDetails();
  }, [itemId]);

  const fetchInitialDetails = async () => {
    try {
      setLoadingItem(true);
      setLoadingCats(true);
      
      const [catsRes, itemRes] = await Promise.all([
        api.categories.list(),
        api.inventory.get(itemId)
      ]);
      
      setCategories(catsRes);
      setItem(itemRes);
      
      // Populate fields
      setName(itemRes.name);
      setSku(itemRes.sku);
      setCategoryId(itemRes.categoryId.toString());
      setDescription(itemRes.description || '');
      setMinRequired(itemRes.minRequired);
      setLocation(itemRes.location || '');
      setSupplier(itemRes.supplier || '');

      setError(null);
    } catch (err) {
      console.error('Error fetching inventory item details:', err);
      setError('Item detail retrieval crash. Asset may have been purged.');
    } finally {
      setLoadingItem(false);
      setLoadingCats(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !categoryId) {
      setError('Material Name, SKU Identifier and Category classification are required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await api.inventory.update(itemId, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId: parseInt(categoryId),
        description: description.trim(),
        minRequired: parseInt(minRequired.toString()) || 5,
        location: location.trim(),
        supplier: supplier.trim()
      });
      
      setSuccess('Educational item spec logs modified successfully in records!');
      setTimeout(() => {
        onNavigate('/inventory');
      }, 1000);
    } catch (err) {
      console.error('Asset modification error:', err);
      setError(err.response?.data?.error || 'Database rejected update query. Ensure SKU is unique.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Retrieving catalog record details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-xl mx-auto mt-10 text-center">
        <p className="font-bold">{error || 'Record is inaccessible'}</p>
        <button
          onClick={() => onNavigate('/inventory')}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
        >
          Back to Materials
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans">
      {/* Back link */}
      <div>
        <button
          onClick={() => onNavigate('/inventory')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-850 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Material Library</span>
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Edit className="w-5 h-5 text-indigo-600" />
          <span>Update Material: <span className="text-indigo-650">{item.name}</span></span>
        </h2>
        <p className="text-slate-500 text-xs mt-1">Amend placement configurations, reorder thresholds, description, or supply partners for SKU: <span className="font-semibold text-slate-800">{item.sku}</span>.</p>

        {/* Outer Form */}
        <form onSubmit={handleUpdate} className="mt-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Material Name *</label>
              <input
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-semibold"
              />
            </div>

            {/* Category Folder Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Category Folder *</label>
              {loadingCats ? (
                <div className="py-2 text-xs font-medium text-slate-400">Loading classifications...</div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-white font-medium"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* SKU block */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">SKU Barcode Identifier *</label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-mono uppercase tracking-wider font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description & Age Fit</label>
            <textarea
              placeholder="Provide age rating or classroom use remarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 h-20 resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Required Min Stock safety threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Safety Threshold Minimum *</label>
              <input
                type="number"
                required
                min={0}
                value={minRequired}
                onChange={(e) => setMinRequired(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-bold"
              />
            </div>

            {/* Storage placement location tag */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Storage Shelf Location</label>
              <input
                type="text"
                placeholder="Shelf B3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
            </div>

            {/* Supply partner */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Supplier / Vendor</label>
              <input
                type="text"
                placeholder="Educational Stores Inc"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-650 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-2 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Buttons row */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('/inventory')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs text-white bg-indigo-600 hover:bg-indigo-750 font-semibold rounded-xl tracking-wide shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>{saving ? 'Modifying...' : 'Update Specs'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
