import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Key, 
  ShieldCheck, 
  Database, 
  Users, 
  Save, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Calendar,
  Lock,
  Compass,
  UserPlus
} from 'lucide-react';
import { api } from '../services/api.js';

export default function Profile({ user, onNavigate }) {
  // Local profile details (initialized from logged-in user property)
  const [username, setUsername] = useState(user.username || '');
  const [email, setEmail] = useState(user.email || '');

  // Password alteration states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Info alerts & indicators
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Lists
  const [activityLogs, setActivityLogs] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Staff registration states (Admin only)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Teacher');
  const [regSuccess, setRegSuccess] = useState(null);
  const [regError, setRegError] = useState(null);
  const [registeringLoading, setRegisteringLoading] = useState(false);

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setRegSuccess(null);
    setRegError(null);

    const cleanUser = regUsername.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUser || !regEmail.trim() || !regPassword) {
      setRegError('Username, email, and password are required.');
      return;
    }

    try {
      setRegisteringLoading(true);
      await api.auth.registerStaff({
        username: cleanUser,
        email: regEmail.trim(),
        password: regPassword,
        role: regRole
      });

      setRegSuccess(`Staff account @${cleanUser} with role ${regRole} was created successfully!`);
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegRole('Teacher');
      
      // Instantly update personnel table list
      fetchAuxiliaryFeeds();
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed. That username or email might already be in use.');
    } finally {
      setRegisteringLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxiliaryFeeds();
  }, []);

  const fetchAuxiliaryFeeds = async () => {
    try {
      setLoadingFeeds(true);
      const [sumRes, usersRes] = await Promise.all([
        api.dashboard.getSummary().catch(() => ({ recentLogs: [] })),
        api.auth.listUsers().catch(() => [])
      ]);
      setActivityLogs(sumRes.recentLogs || []);
      setPersonnelList(usersRes || []);
    } catch (err) {
      console.error('Error fetching profile auxiliary feeds:', err);
    } finally {
      setLoadingFeeds(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (!username.trim() || !email.trim()) {
      setProfileError('Username and email fields are required.');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.auth.updateProfile({
        username: username.trim(),
        email: email.trim()
      });
      
      // Update JWT token in localStorage
      localStorage.setItem('preschool_auth_token', res.token);
      
      setProfileSuccess('Your profile details were updated and saved successfully.');
      
      // Quick refresh parent session and lists
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Profile update failed. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please input your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password confirmation does not match.');
      return;
    }

    try {
      setSavingPassword(true);
      await api.auth.updatePassword({
        currentPassword,
        newPassword
      });

      setPasswordSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchAuxiliaryFeeds();
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Password update failed. Please check credentials.');
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'Admin':
        return 'Superuser Access. Holds full control over database initialization, categories, all inventory lists, damage reports, and personnel files.';
      case 'Store Manager':
        return 'Manager Access. Authorized to add items, modify quantities, review low stock logs, execute replenishment runs, and audit alert flags.';
      case 'Teacher':
        return 'Staff/Teacher Level Access. Qualified to review inventory, perform stock checkouts, flag broken supplies, and report classroom damage.';
      default:
        return 'Standard User Access privileges.';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-600" />
            <span>My Account Console</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review active system authority credentials, modify email or access code secrets</p>
        </div>
        <button 
          onClick={fetchAuxiliaryFeeds}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl tracking-wide transition-all self-start cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingFeeds ? 'animate-spin' : ''}`} />
          <span>Refresh Details</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column 1: Account Info & Password Modification */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section A: Profile Detail Modification */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Personal Information Console</h3>
                <p className="text-[10px] text-slate-400">Modify registered staff username and authorized dispatch email address</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Staff Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium"
                      placeholder="e.g. director"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Authorized Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium"
                      placeholder="e.g. emily@preschool.com"
                    />
                  </div>
                </div>

              </div>

              {/* Status information banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Account Console Level:</span>
                <span className="px-2 py-0.5 font-extrabold uppercase tracking-wide text-[9px] bg-slate-200/60 rounded text-slate-800 border border-slate-300">
                  {user.role} Privilege
                </span>
              </div>

              {/* Profile SUCCESS OR ERROR Messages */}
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Save changes button */}
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-55"
              >
                {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Profile Changes</span>
              </button>

            </form>
          </div>

          {/* Section B: Security Password Changes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security & Credentials Administration</h3>
                <p className="text-[10px] text-slate-400">Regularly update your console access codes to prevent unauthorized entries</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium"
                    placeholder="Enter current password passphrase"
                  />
                </div>
              </div>

              {/* Grid for new password details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password (Min 6 chars)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium"
                      placeholder="Choose new password"
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 text-xs font-medium"
                      placeholder="Retype new password"
                    />
                  </div>
                </div>

              </div>

              {/* Password success / error feedback */}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Save password button */}
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-55"
              >
                {savingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Update Password Code</span>
              </button>

            </form>

          </div>

        </div>

        {/* Column 2: Authority level, personnel cards and activity log timeline */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card A: Account Authority Level Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Your Authority Level</h3>
            </div>

            <div className="bg-indigo-50/30 p-4 border border-indigo-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
                <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-widest">{user.role} Status</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {getRoleDescription(user.role)}
              </p>
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Session initialized at {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Card B: Workspace Personnel Ledger References */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered System Accounts</h3>
                <p className="text-[10px] text-slate-400">Total authorized staff members registers listed</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {personnelList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No other directories found.</p>
              ) : (
                personnelList.map((st) => (
                  <div key={st.id} className="p-2.5 rounded-xl border border-slate-50 hover:bg-slate-50/50 flex items-center justify-between transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-800">@{st.username}</p>
                      <p className="text-[10px] text-slate-400">{st.email}</p>
                    </div>
                    <div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        st.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 
                        st.role === 'Store Manager' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 
                        'bg-amber-50 text-amber-750 border border-amber-150'
                      }`}>
                        {st.role === 'Admin' ? 'Admin' : st.role === 'Store Manager' ? 'Manager' : 'Staff'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Provision Staff Account (Only visible to Admin role) */}
          {user.role === 'Admin' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Provision Staff Account</h3>
                  <p className="text-[10px] text-slate-400">Create new staff logins with custom emails & pass codes</p>
                </div>
              </div>

              <form onSubmit={handleRegisterStaff} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Username (lowercase, no spaces)</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. jessica_lee"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650/15 focus:border-indigo-650 text-xs font-medium bg-slate-50/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Email Address</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. jessica@preschool.com"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650/15 focus:border-indigo-650 text-xs font-medium bg-slate-50/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Access Pass Code</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="e.g. key987"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650/15 focus:border-indigo-650 text-xs font-medium bg-slate-50/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650/15 focus:border-indigo-650 text-xs font-medium bg-slate-50/10 h-[36px]"
                    >
                      <option value="Teacher">Teacher</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                {regSuccess && (
                  <div className="p-2.5 gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] rounded-lg font-medium flex items-center">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                {regError && (
                  <div className="p-2.5 gap-2 bg-red-50 text-red-800 border border-red-100 text-[11px] rounded-lg font-medium flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 text-red-650 flex-shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registeringLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {registeringLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Register Staff Member</span>
                </button>
              </form>
            </div>
          )}

          {/* Card C: Personal Action Trail (Audit Logs) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your Action & System Audit Trail</h3>
                <p className="text-[10px] text-slate-400">Chronological history logs of the last several console updates</p>
              </div>
            </div>

            <div className="flow-root">
              <ul className="-mb-8">
                {activityLogs.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">No recent actions logged.</div>
                ) : (
                  activityLogs.slice(0, 4).map((log, logIdx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {logIdx !== activityLogs.slice(0, 4).length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center ring-8 ring-white font-bold text-indigo-650 text-[10px]">
                              #{log.id}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {log.action}{' '}
                                <span className="font-normal text-slate-500 font-mono text-[10px]">
                                  by @{log.username || 'System'}
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{log.details}</p>
                            </div>
                            <div className="text-right text-[9px] whitespace-nowrap text-slate-400">
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
