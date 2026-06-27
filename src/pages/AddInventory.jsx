import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowLeft, Archive, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';

export default function AddInventory({ user, onNavigate }) {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCats(true);
      const res = await api.categories.list();
      setCategories(res);
      if (res.length > 0) {
        setCategoryId(res[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCats(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !categoryId) {
      setError('Material Name, SKU Identifier and Category classification are required fields.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.inventory.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId: parseInt(categoryId),
        description: description.trim(),
        minRequired: parseInt(minRequired.toString()) || 5,
        location: location.trim(),
        supplier: supplier.trim()
      });
      // Redirect to Inventory list on success
      onNavigate('/inventory');
    } catch (err) {
      console.error('Asset submission crash:', err);
      setError(err.response?.data?.error || 'Database rejected register query. Ensure SKU is unique.');
    } finally {
      setSaving(false);
    }
  };

  const generateMockSku = () => {
    if (!name.trim()) {
      setError('Kindly type in a material name first to generate a suggested SKU.');
      return;
    }
    const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const sub = categoryId ? `0${categoryId}` : '99';
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${sub}-${rand}`);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans">
      {/* Back click link */}
      <div>
        <button
          onClick={() => onNavigate('/inventory')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Material Library</span>
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Archive className="w-5 h-5 text-indigo-600" />
          <span>Register New Educational Asset</span>
        </h2>
        <p className="text-slate-500 text-xs mt-1">Catalog classroom item details into database. Initial stock always defaults to 0 pieces. Use "Stock Adjustments" to check-in new stock.</p>

        {/* Outer Form */}
        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Material Name *</label>
              <input
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Wooden Counting Abacus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
            </div>

            {/* Category Folder selection */}
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
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 relative">
            <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">SKU Barcode Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOY-WD-ABACUS"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white font-mono uppercase tracking-wider font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={generateMockSku}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer self-stretch flex items-center justify-center"
              >
                Auto Generate SKU
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">SKU must be fully unique (alphanumeric/hyphen only e.g. BOK-DRS-CAT).</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description & Age Fit</label>
            <textarea
              placeholder="e.g. Pine wood counting beads for toddler mathematical learning, age 3+."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 h-20 resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Required min threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Required Safety Min *</label>
              <input
                type="number"
                required
                min={0}
                value={minRequired}
                onChange={(e) => setMinRequired(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Fires alerts when stock drops below</span>
            </div>

            {/* Storage placement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Storage Shelf Location</label>
              <input
                type="text"
                placeholder="e.g. Cabinet B, Shelf 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Helpful classroom location tags</span>
            </div>

            {/* Procurement partner / supplier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Supplier / Vendor</label>
              <input
                type="text"
                placeholder="e.g. Scholastic Play LLC"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 bg-slate-50/25 font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
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
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl tracking-wide shadow-md shadow-indigo-600/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{saving ? 'Creating...' : 'Register Item'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
