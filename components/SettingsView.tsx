import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase';
import { Cloud, WifiOff, Database, ServerCrash, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  userId: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userId }) => {
  const [elecRate, setElecRate] = useState('6');
  const [milkRate, setMilkRate] = useState('60');
  const [loading, setLoading] = useState(true);

  const isDemo = userId === 'local-demo-user';

  useEffect(() => {
    // --- DEMO MODE FALLBACK ---
    if (isDemo) {
        const stored = localStorage.getItem('demo_settings');
        if (stored) {
            const d = JSON.parse(stored);
            setElecRate(String(d.electricityRate || 6));
            setMilkRate(String(d.milkRate || 60));
        }
        setLoading(false);
        return;
    }
    // --------------------------

    const docRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'settings', 'global');
    const unsub = onSnapshot(docRef, (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setElecRate(String(d.electricityRate || 6));
        setMilkRate(String(d.milkRate || 60));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId, isDemo]);

  const saveSettings = async () => {
    // --- DEMO MODE FALLBACK ---
    if (isDemo) {
        const s = {
            electricityRate: parseFloat(elecRate),
            milkRate: parseFloat(milkRate)
        };
        localStorage.setItem('demo_settings', JSON.stringify(s));
        alert("Settings saved (Local Demo Mode only)!");
        return;
    }
    // --------------------------

    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'settings', 'global'), {
        electricityRate: parseFloat(elecRate),
        milkRate: parseFloat(milkRate)
      }, { merge: true });
      alert("Settings saved to Database!");
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6 p-1 pb-20">
      <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>

      {/* DATABASE STATUS CARD */}
      <div className={`rounded-xl p-4 border ${isDemo ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${isDemo ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                {isDemo ? <WifiOff size={24} /> : <Cloud size={24} />}
            </div>
            <div>
                <h3 className={`font-bold ${isDemo ? 'text-orange-800' : 'text-green-800'}`}>
                    {isDemo ? 'Data Not Saved to Cloud' : 'Connected to Database'}
                </h3>
                <p className={`text-sm mt-1 ${isDemo ? 'text-orange-700' : 'text-green-700'}`}>
                    {isDemo 
                        ? "You are in Demo Mode. Data is only stored in your browser cache and will be lost if you clear cookies." 
                        : "Your data is securely synced and stored in the Firebase Cloud Database."}
                </p>
                {isDemo && (
                    <div className="mt-3 text-xs bg-white/50 p-2 rounded text-orange-900 border border-orange-100">
                        <strong>To fix connection:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>Go to Firebase Console &gt; Build &gt; Authentication &gt; Enable <b>Anonymous</b>.</li>
                            <li>Go to Firebase Console &gt; Build &gt; Firestore &gt; <b>Create Database</b> (Test Mode).</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Default Electricity Rate (₹/unit)</label>
          <input 
            type="number" 
            step="0.1"
            value={elecRate} 
            onChange={e => setElecRate(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <p className="text-xs text-gray-400 mt-2">This rate will be auto-filled when generating new electricity bills.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Milk Rate (₹/Liter)</label>
          <input 
            type="number" 
            step="0.1"
            value={milkRate} 
            onChange={e => setMilkRate(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <p className="text-xs text-gray-400 mt-2">Used to calculate the total monthly cost in the Milk Tracker.</p>
        </div>

        <button 
          onClick={saveSettings}
          className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          {isDemo ? <Database size={18} /> : <CheckCircle2 size={18} />}
          {isDemo ? 'Save Locally' : 'Save to Cloud'}
        </button>
      </div>
      
      <div className="text-center space-y-1 mt-8 opacity-50">
        <p className="text-xs font-medium text-gray-500">Home Bills Tracker v1.1</p>
        <p className="text-[10px] text-gray-400">ID: {userId}</p>
      </div>
    </div>
  );
};