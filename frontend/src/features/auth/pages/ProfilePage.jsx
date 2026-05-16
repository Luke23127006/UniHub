import { useAuth } from '@/context/AuthContext';
import { User, Mail, Shield, LogOut, ArrowLeft, Fingerprint, Activity } from 'lucide-react';
import { Link } from 'react-router';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] text-gray-900 dark:text-gray-100 py-12 px-4 relative overflow-hidden transition-colors duration-300">


      <div className="max-w-xl mx-auto relative z-10">
        
        {/* Back Link - Solid Gray for visibility */}
        <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-500 hover:text-unihub-gold transition-all mb-8 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          System / Dashboard
        </Link>

        <div className="bg-white dark:bg-[#141414]/80 backdrop-blur-xl rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-none overflow-hidden">
          
          {/* Tech Header */}
          <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-unihub-bg dark:bg-gradient-to-tr dark:from-unihub-gold dark:to-yellow-500 p-[1px]">
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-[#141414] flex items-center justify-center text-unihub-bg dark:text-unihub-gold">
                    <User size={36} strokeWidth={2} />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center border-2 border-white dark:border-[#141414]">
                  <Activity size={12} className="text-white" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">
                    {user.full_name}
                  </h1>
                  <div className="h-px w-8 bg-unihub-gold"></div>
                </div>
                <p className="text-[11px] font-mono text-gray-600 dark:text-unihub-gold/70 uppercase tracking-[0.15em] font-bold">
                  Verification Level: Standard
                </p>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="p-6 grid grid-cols-1 gap-4">
            
            {/* Email Field - High Contrast */}
            <div className="group flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-unihub-gold transition-all shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-transparent flex items-center justify-center text-gray-700 dark:text-gray-400 group-hover:text-unihub-gold">
                  <Mail size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.1em] mb-1">Account Communication</p>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-200">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Role & ID Fields (Side by Side) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="group p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-unihub-primary transition-all shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={18} strokeWidth={2} className="text-unihub-primary dark:text-blue-400" />
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.1em]">Access Tier</span>
                </div>
                <p className="text-base font-black text-unihub-primary dark:text-blue-400 uppercase italic tracking-wider">{user.role}</p>
              </div>

              <div className="group p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-purple-600 transition-all shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Fingerprint size={18} strokeWidth={2} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.1em]">System ID</span>
                </div>
                <p className="text-[11px] font-mono font-black text-purple-700 dark:text-purple-400 tracking-tight">USR-{user.id?.slice(-8).toUpperCase() || '002391'}</p>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="p-8 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-transparent">
            <button
              onClick={logout}
              className="group relative w-full py-4 rounded-2xl overflow-hidden transition-all active:scale-[0.98] border border-red-200 dark:border-red-500/20 shadow-sm"
            >
              <div className="absolute inset-0 bg-red-500/[0.05] dark:bg-red-500/10 group-hover:bg-red-500/10 dark:group-hover:bg-red-500/20 transition-all"></div>
              <div className="relative flex items-center justify-center gap-3 text-red-600 dark:text-red-500 text-sm font-black uppercase tracking-[0.2em]">
                <LogOut size={18} />
                Terminate Session
              </div>
            </button>
            
            <p className="text-center mt-6 text-[9px] text-gray-500 dark:text-gray-600 uppercase tracking-[0.3em] font-black">
              UniHub Secure Authentication Node / PROD-2.1.0
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
