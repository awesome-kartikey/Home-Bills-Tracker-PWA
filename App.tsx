import React, { useState, useEffect } from 'react';
import { 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './services/firebase';
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
  RefreshCw
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('tenants');
  const [selectedTenantForBill, setSelectedTenantForBill] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

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

    const initAuth = async () => {
      try {
        // Attempt to sign in anonymously
        await signInAnonymously(auth);
      } catch (error: any) {
        console.error("Auth initialization error:", error);
        let msg = "Connection failed.";
        
        if (error.code === 'auth/operation-not-allowed') {
            msg = "Please enable 'Anonymous' sign-in in Firebase Console.";
        } else if (error.code === 'auth/configuration-not-found') {
            msg = "Firebase config issue. Check console.";
        } else if (error.code === 'auth/api-key-not-valid') {
            msg = "Invalid API Key.";
        }

        if (mounted) {
          enableDemoMode(msg);
        }
      }
    };

    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, 
      (u) => {
        if (mounted && u) {
          setUser(u);
          setLoading(false);
          // Clear demo mode if we get a real user (though unlikely if we already fell back)
          if (isDemo) setIsDemo(false);
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

  const handleManualSignIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Manual sign in error", error);
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
            <div className="text-center max-w-xs mx-auto">
                <div className="bg-blue-100 p-4 rounded-full inline-flex mb-4 text-blue-600">
                    <Users size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome</h1>
                <p className="text-gray-500 mb-6">Home Bills Tracker requires authentication to secure your data.</p>
                <button 
                    onClick={handleManualSignIn} 
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                >
                    Enter App
                </button>
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
            <p className="text-[10px] text-blue-100 opacity-80 font-mono flex items-center gap-1">
                ID: {user.uid.slice(0,6)}
            </p>
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