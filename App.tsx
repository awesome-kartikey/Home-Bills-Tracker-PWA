import React, { useState, useEffect } from 'react';
import { 
  signInWithCustomToken, 
  signInAnonymously, 
  signInWithPopup,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import { TenantsView } from './components/TenantsView';
import { HistoryView } from './components/HistoryView';
import { MilkView } from './components/MilkView';
import { SettingsView } from './components/SettingsView';
import { GenerateBillView } from './components/GenerateBillView';
import { Tenant, Tab } from './types';
import { 
  Users, 
  FileText, 
  Droplets, 
  Settings, 
  LogOut,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Copy
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('tenants');
  const [selectedTenantForBill, setSelectedTenantForBill] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [domainToAuth, setDomainToAuth] = useState<string | null>(null);

  // Demo User Factory
  const createDemoUser = (): User => ({
    uid: 'local-demo-user',
    email: null,
    displayName: 'Demo User',
    emailVerified: false,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'demo-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
  } as unknown as User);

  const enableDemoMode = (reason?: string) => {
    if (!isDemo) {
      console.warn("Enabling Demo Mode. Reason:", reason);
      if (reason) setAuthErrorMsg(reason);
      const demoUser = createDemoUser();
      setUser(demoUser);
      setIsDemo(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, 
      (u) => {
        if (mounted) {
          if (u) {
            setUser(u);
            setLoading(false);
            if (isDemo) setIsDemo(false);
          } else {
            // If no user is found, we stop loading and show the login screen
            // We do NOT auto-login anonymously anymore to give them a choice
            setLoading(false);
            setUser(null);
          }
        }
      },
      (error) => {
        console.error("Auth state change error:", error);
        if (mounted) enableDemoMode("Session error");
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthErrorMsg(null);
      setDomainToAuth(null);
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      console.error("Google sign in error", error);
      setLoading(false);
      
      if (error.code === 'auth/unauthorized-domain') {
        setDomainToAuth(window.location.hostname);
        setAuthErrorMsg("Domain Unauthorized");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthErrorMsg("Sign-in cancelled.");
      } else {
        setAuthErrorMsg(error.message || "Google Sign-In failed.");
      }
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Guest sign in error", error);
      let msg = "Connection failed.";
      if (error.code === 'auth/operation-not-allowed') msg = "Enable Anonymous Auth in Console";
      enableDemoMode(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50 text-blue-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="font-bold text-lg animate-pulse">Loading Tracker...</p>
        </div>
      </div>
    );
  }

  if (!user) {
     return (
        <div className="flex items-center justify-center h-screen bg-gray-50 px-6">
            <div className="text-center max-w-xs w-full mx-auto">
                <div className="bg-blue-100 p-5 rounded-3xl inline-flex mb-6 text-blue-600 shadow-sm">
                    <Users size={40} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">Sign in to securely track bills, manage tenants, and sync data across devices.</p>
                
                <div className="space-y-4">
                  <button 
                      onClick={handleGoogleSignIn} 
                      className="w-full bg-white text-gray-700 border border-gray-300 px-6 py-3.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                  </button>

                  <button 
                      onClick={handleGuestSignIn} 
                      className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                  >
                      Continue as Guest
                  </button>
                </div>

                {authErrorMsg && (
                  <div className="mt-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 text-left">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span className="font-bold">{authErrorMsg}</span>
                    </div>
                    {domainToAuth && (
                      <div className="text-xs mt-2">
                        <p className="mb-1">Add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains:</p>
                        <div className="bg-white p-2 rounded border border-red-200 font-mono flex justify-between items-center">
                          <span className="truncate">{domainToAuth}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(domainToAuth)}
                            className="text-blue-600 font-bold ml-2 hover:underline"
                          >
                            COPY
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
        </div>
     )
  }

  const handleNavigateToBill = (tenant: Tenant) => {
    setSelectedTenantForBill(tenant);
    setActiveTab('generate');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tenants':
        return <TenantsView userId={user.uid} onGenerateBill={handleNavigateToBill} />;
      case 'history':
        return <HistoryView userId={user.uid} />;
      case 'milk':
        return <MilkView userId={user.uid} />;
      case 'settings':
        return <SettingsView userId={user.uid} />;
      case 'generate':
        if (!selectedTenantForBill) return <TenantsView userId={user.uid} onGenerateBill={handleNavigateToBill} />;
        return (
          <GenerateBillView 
            userId={user.uid} 
            tenant={selectedTenantForBill} 
            onBack={() => {
              setSelectedTenantForBill(null);
              setActiveTab('tenants');
            }}
            onComplete={() => {
              setSelectedTenantForBill(null);
              setActiveTab('history');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-md z-20 pt-safe-top flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Home Bills
                {isDemo && (
                  <span className="bg-orange-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 text-white shadow-sm border border-orange-300/30">
                    <WifiOff size={10}/> Demo
                  </span>
                )}
            </h1>
            {user.photoURL && !isDemo ? (
               <div className="flex items-center gap-2 mt-1 opacity-90">
                 <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full border border-white/50" />
                 <p className="text-[10px] font-medium truncate max-w-[120px]">
                   {user.displayName || 'User'}
                 </p>
               </div>
            ) : (
               <p className="text-[10px] text-blue-100 opacity-80 font-mono flex items-center gap-1">
                  ID: {user.uid.slice(0,6)}
               </p>
            )}
        </div>
        <button 
            onClick={() => {
                auth.signOut().catch(() => {}); 
                setUser(null); 
                setIsDemo(false);
                setAuthErrorMsg(null);
            }} 
            className="p-2 hover:bg-blue-700 rounded-full transition-colors flex items-center gap-2 bg-blue-700/30" 
            title={isDemo ? "Retry Connection" : "Sign Out"}
        >
            {isDemo ? <RefreshCw size={18} /> : <LogOut size={18} />}
            {isDemo && <span className="text-xs font-medium">Retry</span>}
        </button>
      </div>

      {/* Connection Warning Banner */}
      {isDemo && authErrorMsg && (
         <div className="bg-orange-50 text-orange-800 text-xs p-2 text-center border-b border-orange-100 flex items-center justify-center gap-2">
            <AlertTriangle size={12} className="shrink-0" />
            <span className="truncate max-w-[280px]">{authErrorMsg}</span>
         </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 scroll-smooth">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 flex justify-around pb-safe-bottom pt-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <NavButton 
          active={activeTab === 'tenants' || activeTab === 'generate'} 
          onClick={() => setActiveTab('tenants')} 
          icon={<Users size={22} strokeWidth={activeTab === 'tenants' ? 2.5 : 2} />} 
          label="Tenants" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<FileText size={22} strokeWidth={activeTab === 'history' ? 2.5 : 2} />} 
          label="History" 
        />
        <NavButton 
          active={activeTab === 'milk'} 
          onClick={() => setActiveTab('milk')} 
          icon={<Droplets size={22} strokeWidth={activeTab === 'milk' ? 2.5 : 2} />} 
          label="Milk" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />} 
          label="Config" 
        />
      </div>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full py-3 transition-all duration-200 group ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <div className={`mb-1 transform transition-transform duration-200 ${active ? 'scale-110 -translate-y-0.5' : 'group-hover:-translate-y-0.5'}`}>
        {icon}
    </div>
    <span className={`text-[10px] font-bold transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {label}
    </span>
  </button>
);