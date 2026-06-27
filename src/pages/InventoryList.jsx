import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  ListFilter, 
  PlusCircle, 
  Edit, 
  Trash2, 
  AlertOctagon, 
  CheckCircle,
  FolderPlus,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api.js';

export default function InventoryList({ user, onNavigate }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New category creation dialog state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState(null);
  const [catSuccess, setCatSuccess] = useState(null);

  // Safe delete confirmations states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const canManage = user.role === 'Admin' || user.role === 'Store Manager';

  useEffect(() => {
    fetchInitialData();
  }, [search, selectedCategory]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch both categories and inventory lists
      const [catsRes, itemsRes] = await Promise.all([
        api.categories.list(),
        api.inventory.list({ q: search, categoryId: selectedCategory || undefined })
      ]);
      setCategories(catsRes);
      setItems(itemsRes);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory lists:', err);
      setError('Connection with storage database lost. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (id, name) => {
    setDeleteTarget({ id, name });
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  const confirmPurgeItem = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteError(null);
      setDeleteSuccess(null);
      await api.inventory.delete(deleteTarget.id);
      setItems(items.filter(item => item.id !== deleteTarget.id));
      setDeleteSuccess(`Material "${deleteTarget.name}" deleted successfully from library.`);
      setTimeout(() => {
        setDeleteTarget(null);
        setDeleteSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Delete failure:', err);
      setDeleteError(err.response?.data?.error || 'Failed to delete selected item.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError('Category name cannot be empty.');
      return;
    }

    try {
      setCatError(null);
      const newCat = await api.categories.create({
        name: catName.trim(),
        description: catDesc.trim()
      });
      setCategories([...categories, newCat]);
      setCatSuccess(`Created category "${newCat.name}" successfully!`);
      setCatName('');
      setCatDesc('');
      
      setTimeout(() => {
        setCatSuccess(null);
        setShowCatModal(false);
      }, 1500);
    } catch (err) {
      console.error('Category creation failure:', err);
      setCatError(err.response?.data?.error || 'Failed to create new category folder.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Page Title & Utility buttons */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Toy & Learning Material Library</h2>
          <p className="text-slate-500 text-sm mt-0.5">Explore, search and manage learning materials, books, and toys</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <button
              onClick={() => setShowCatModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-medium text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Category</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => onNavigate('/inventory/add')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Control filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        
        {/* Search Input bar */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search learning materials by name, SKU, supplier or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/25"
          />
        </div>

        {/* Category filtering selection */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ListFilter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(parseInt(e.target.value))}
            className="w-full md:w-48 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value={0}>All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Database state indicators */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Refreshing material list...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center gap-2 max-w-xl mx-auto mt-6">
          <Package className="w-10 h-10 text-slate-300" />
          <h4 className="font-semibold text-slate-800 text-sm">No Materials Found</h4>
          <p className="text-xs text-slate-500 leading-normal">
            No inventory items matching "{search || 'selected category'}" exist in database. Register a new asset to populate this grid!
          </p>
        </div>
      ) : (
        /* Inventory Items grid table */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider">Asset Details</th>
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider">SKU & Category</th>
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider">Current Stock</th>
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider">Required Safety Min</th>
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider">Location / Storage</th>
                  <th className="p-4 text-xs font-bold text-slate-600 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isLow = item.quantity < item.minRequired;
                  return (
                    <tr key={item.id} className={`transition-all ${isLow ? 'bg-red-50/70 hover:bg-red-100/80 text-red-950 font-medium' : 'hover:bg-slate-50/25 text-slate-800'}`}>
                      {/* Asset item detail */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400 mt-1 max-w-sm truncate">{item.description || 'No description cataloged'}</div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">Supplier: {item.supplier || 'N/A'}</div>
                      </td>
                      
                      {/* SKU / Category fold */}
                      <td className="p-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded">
                          {item.sku}
                        </span>
                        <div className="text-xs font-medium text-slate-500 mt-1.5">
                          {item.categoryName}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black px-2.5 py-1 rounded-lg border shadow-xs transition-all ${
                            isLow 
                              ? 'text-red-700 bg-red-100 border-red-300 font-extrabold shadow-sm shadow-red-100/50' 
                              : 'text-slate-800 bg-slate-50 border-slate-200'
                          }`}>
                            {item.quantity}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">pcs</span>
                        </div>
                        {/* Threshold status pills */}
                        <div className="mt-2">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] bg-red-600 text-white rounded-md font-extrabold shadow-sm shadow-red-600/10 animate-pulse">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>CRITICAL LOW STOCK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-md font-semibold">
                              <CheckCircle className="w-3 h-3" />
                              <span>HEALTHY</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Safety min required threshold */}
                      <td className="p-4 text-xs font-semibold text-slate-500">
                        {item.minRequired} units min
                      </td>

                      {/* Placement shelf */}
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {item.location || 'Classroom shelves'}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigate(`/stock?itemId=${item.id}`)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            title="Adjust stock quantities"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          
                          {canManage && (
                            <>
                              <button
                                onClick={() => onNavigate(`/inventory/edit/${item.id}`)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit specs"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                                title="Purge from records"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog: Category Add Card Form */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 border border-slate-100 shadow-2xl relative">
            <button 
              onClick={() => setShowCatModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              <span>Create Classroom Category</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Isolate learning materials into subdivisions (e.g. Science, puzzles)</p>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Equipment"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Add details about classroom items organized folder"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-slate-50/50 h-16 resize-none"
                />
              </div>

              {catError && (
                <div className="text-[10px] font-semibold text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                  {catError}
                </div>
              )}

              {catSuccess && (
                <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-md border border-emerald-100">
                  {catSuccess}
                </div>
              )}

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-150 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Custom Safe Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 border border-slate-100 shadow-2xl relative">
            <button 
              onClick={() => setDeleteTarget(null)}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              disabled={!!deleteSuccess}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Purge Material Record</span>
            </h3>
            <p className="text-xs text-rose-600 mt-1.5 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100">
              Are you absolutely sure you want to delete <strong>{deleteTarget.name}</strong>? This will purge all related stock history and active low-stock alerts.
            </p>

            <div className="mt-4 space-y-3">
              {deleteError && (
                <div className="text-[11px] font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {deleteError}
                </div>
              )}

              {deleteSuccess && (
                <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  {deleteSuccess}
                </div>
              )}

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-150 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  disabled={!!deleteSuccess}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPurgeItem}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md shadow-red-600/10 cursor-pointer"
                  disabled={!!deleteSuccess}
                >
                  Yes, Purge Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
