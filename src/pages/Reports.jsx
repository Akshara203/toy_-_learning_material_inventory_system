import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, ShieldAlert, BarChart3, Clock, HelpCircle, FileSpreadsheet, Users, Shield } from 'lucide-react';
import { api } from '../services/api.js';

export default function Reports() {
  const [invReport, setInvReport] = useState(null);
  const [dmgReport, setDmgReport] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [invRes, dmgRes, staffRes] = await Promise.all([
        api.reports.inventoryFeed(),
        api.reports.damageFeed(),
        api.auth.listUsers().catch(() => [])
      ]);
      setInvReport(invRes);
      setDmgReport(dmgRes);
      setStaffList(staffRes || []);
    } catch (err) {
      console.error('Error fetching reports feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert objects into CSV format and download directly
  const handleDownloadInventoryCSV = () => {
    if (!invReport || !invReport.data) return;

    const headers = ['SKU', 'Item Name', 'Category', 'Quantity', 'Min Required', 'Safety Status', 'Shelf Location', 'Supplier Name'];
    const rows = invReport.data.map((item) => [
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.categoryName}"`,
      item.quantity,
      item.minRequired,
      `"${item.status}"`,
      `"${(item.location || 'N/A').replace(/"/g, '""')}"`,
      `"${(item.supplier || 'N/A').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Auto click hidden element to fire native browser save popup
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Toy_Learning_Material_Inventory_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDamageCSV = () => {
    if (!dmgReport || !dmgReport.data) return;

    const headers = ['Record ID', 'SKU', 'Material Name', 'Damaged Volume', 'Reporter', 'Status', 'Filing Notes'];
    const rows = dmgReport.data.map((item) => [
      item.id,
      `"${item.sku}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      item.quantity,
      `"${item.reportedBy}"`,
      `"${item.status}"`,
      `"${(item.notes || 'N/A').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Toy_Learning_Material_Damage_Audit_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-20 font-sans">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Compiling financial spreadsheets and inventory ledger records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans print:p-0">
      
      {/* Title block - hidden in absolute system printing */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Center Analytics & Reports</h2>
          <p className="text-slate-500 text-sm mt-0.5">Analyze asset distribution, print safety audits, and download spreadsheets</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Physical Ledger</span>
        </button>
      </div>

      {/* Visual stats metrics split rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3 print:gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Catalog Density</span>
            <p className="text-xl font-bold text-slate-800 mt-1">{invReport?.itemsCount} assets registered</p>
            <span className="text-[10px] text-slate-400">across classroom systems</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Critical Reserves</span>
            <p className="text-xl font-bold text-red-600 mt-1">{invReport?.lowStockCount} items below min</p>
            <span className="text-[10px] text-red-650 font-semibold uppercase tracking-wider block mt-0.5 whitespace-nowrap">Requires urgent reorder</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Damaged items logs</span>
            <p className="text-xl font-bold text-slate-805 mt-1">{dmgReport?.metrics?.activeReports || 0} active reports</p>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Discarded loss count: {dmgReport?.metrics?.discardedReports || 0} pcs</span>
          </div>
        </div>

      </div>

      {/* Main split sections: Inventory Ledger Sheet */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-905 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Full Educational Asset Ledger Status</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive real-time grid of material specs and piece counts</p>
          </div>
          <button
            onClick={handleDownloadInventoryCSV}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-750 font-semibold text-xs rounded-xl cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-450" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* Hidden in plain screen but beautiful on physical print sheets */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-black text-slate-900 border-b pb-2">Toy & Learning Material Inventory System</h1>
          <p className="text-xs text-slate-500 mt-1">Generated date: {new Date(invReport?.generatedAt).toLocaleString()}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-sans">
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">SKU</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Asset Item Title</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider font-sans">Folder classification</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Balance Stock</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Safety Min</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Safety level</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Room Coordinate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invReport?.data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/25 transition-colors">
                  <td className="p-3 font-mono font-semibold text-slate-600">{item.sku}</td>
                  <td className="p-3 font-bold text-slate-800">{item.name}</td>
                  <td className="p-3 font-medium text-slate-500">{item.categoryName}</td>
                  <td className="p-3 font-black text-slate-900">{item.quantity} units</td>
                  <td className="p-3 font-semibold text-slate-450">{item.minRequired}</td>
                  <td className="p-3">
                    {item.status === 'LOW STOCK' ? (
                      <span className="text-red-650 font-extrabold text-[10px]">⚠️ REORDER REQ</span>
                    ) : (
                      <span className="text-emerald-700 font-extrabold text-[10px]">🟢 HEALTHY</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">{item.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damaged registers overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Unusable & Damaged Item Log audits</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological summary of broken pieces and salvage outcomes</p>
          </div>
          <button
            onClick={handleDownloadDamageCSV}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-750 font-semibold text-xs rounded-xl cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-450" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Record ID</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Asset Item Name</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider font-sans">Damaged volume</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Filer Staff</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Filing comments / notes</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Status Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dmgReport?.data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/25 transition-colors">
                  <td className="p-3 text-slate-450 font-mono font-bold">#DM{item.id}</td>
                  <td className="p-3 font-semibold text-slate-800">{item.itemName}</td>
                  <td className="p-3 font-black text-rose-650">{item.quantity} pieces</td>
                  <td className="p-3 text-slate-600">@{item.reportedBy}</td>
                  <td className="p-3 text-slate-500 max-w-sm truncate" title={item.notes}>{item.notes}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                      item.status === 'Reported' ? 'bg-amber-50 text-amber-700' :
                      item.status === 'Repaired' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Personnel Directory & Credentials Guide */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Staff Personnel & Account Authorization Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Summary of all registered staff accounts, official emails, and console access powers</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">User ID</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Username Reference</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Registered Email</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Role Privilege</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Authority Description & Level</th>
                <th className="p-3 text-xs font-bold text-slate-600 tracking-wider">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/25 transition-colors">
                  <td className="p-3 text-slate-450 font-mono font-bold">#US0{st.id}</td>
                  <td className="p-3 font-semibold text-slate-800">@{st.username}</td>
                  <td className="p-3 font-medium text-slate-600">{st.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                      st.role === 'Admin' ? 'bg-indigo-50 text-indigo-700' :
                      st.role === 'Store Manager' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {st.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    {st.role === 'Admin' && 'Superuser console access - Full control over categories, inventory entries, and user logs.'}
                    {st.role === 'Store Manager' && 'Procurement manager - Full stock modifications, reorder adjustments, and alert diagnostics.'}
                    {st.role === 'Teacher' && 'Classroom user - Can checkout materials, files defect reports, and review live alerts.'}
                  </td>
                  <td className="p-3 text-slate-450">
                    {st.createdAt ? new Date(st.createdAt).toLocaleString() : 'System Default'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
