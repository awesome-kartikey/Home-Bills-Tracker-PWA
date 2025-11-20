import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase';
import { callGemini } from '../services/gemini';
import { Tenant } from '../types';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

interface GenerateBillViewProps {
  userId: string;
  tenant: Tenant;
  onBack: () => void;
  onComplete: () => void;
}

interface CalculatedBill {
  unitsUsed: number;
  elecAmount: number;
  rentAmount: number;
  totalAmount: number;
  previousDate: Date;
  currentDate: Date;
}

// Helper for Demo Mode Timestamps
const createMockTimestamp = (seconds: number) => ({
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000)
} as Timestamp);

export const GenerateBillView: React.FC<GenerateBillViewProps> = ({ userId, tenant, onBack, onComplete }) => {
  const [latestReading, setLatestReading] = useState('');
  const [rate, setRate] = useState('6');
  const [includeRent, setIncludeRent] = useState(true);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculated, setCalculated] = useState<CalculatedBill | null>(null);
  
  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  useEffect(() => {
    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
        const stored = localStorage.getItem('demo_settings');
        if (stored) {
            setRate(String(JSON.parse(stored).electricityRate || '6'));
        }
        return;
    }
    // --------------------------

    const fetchSettings = async () => {
      const docRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'settings', 'global');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setRate(String(docSnap.data().electricityRate || '6'));
        }
      });
      return () => unsubscribe();
    };
    fetchSettings();
  }, [userId]);

  const handleCalculate = () => {
    const current = parseFloat(latestReading);
    const previous = tenant.lastReading;
    const rateVal = parseFloat(rate);

    if (isNaN(current)) {
        alert("Please enter a valid reading");
        return;
    }

    if (current < previous) {
      alert("Latest reading cannot be less than previous reading.");
      return;
    }

    const unitsUsed = current - previous;
    const elecAmount = unitsUsed * rateVal;
    const rentAmount = includeRent ? tenant.rent : 0;
    const totalAmount = elecAmount + rentAmount;

    setCalculated({
      unitsUsed,
      elecAmount,
      rentAmount,
      totalAmount,
      previousDate: tenant.lastReadingDate?.toDate(),
      currentDate: new Date(billDate)
    });
    setAiInsight(null); 
  };

  const handleAnalyzeUsage = async () => {
    if (!calculated) return;
    setIsAnalyzing(true);
    
    const prompt = `
      You are an energy efficiency assistant. 
      Analyze this electricity usage:
      - Units consumed: ${calculated.unitsUsed.toFixed(1)}
      - Days elapsed: ${Math.ceil((calculated.currentDate.getTime() - calculated.previousDate.getTime()) / (1000 * 60 * 60 * 24))}
      - Electricity Cost: ₹${calculated.elecAmount}
      - Rate: ₹${rate}/unit
      
      Is this usage considered low, moderate, or high for a typical single room in India? 
      Provide one short, specific, helpful energy saving tip. 
      Keep the response under 40 words.
    `;

    const result = await callGemini(prompt);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  const handleSave = async () => {
    if (!calculated) return;

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
        try {
            // 1. Save Bill
            const storedBills = JSON.parse(localStorage.getItem('demo_bills') || '[]');
            const newBill = {
                id: 'bill_' + Date.now(),
                tenantId: tenant.id,
                tenantName: tenant.name,
                rentIncluded: includeRent,
                lastReading: tenant.lastReading,
                lastReadingDate: tenant.lastReadingDate,
                latestReading: parseFloat(latestReading),
                latestReadingDate: createMockTimestamp(Math.floor(new Date(billDate).getTime()/1000)),
                unitsUsed: calculated.unitsUsed,
                rate: parseFloat(rate),
                electricityAmount: calculated.elecAmount,
                rentAmount: calculated.rentAmount,
                totalAmount: calculated.totalAmount,
                createdAt: createMockTimestamp(Math.floor(Date.now()/1000))
            };
            localStorage.setItem('demo_bills', JSON.stringify([...storedBills, newBill]));

            // 2. Update Tenant
            const storedTenants = JSON.parse(localStorage.getItem('demo_tenants') || '[]');
            const updatedTenants = storedTenants.map((t: any) => {
                if (t.id === tenant.id) {
                    return {
                        ...t,
                        lastReading: parseFloat(latestReading),
                        lastReadingDate: createMockTimestamp(Math.floor(new Date(billDate).getTime()/1000))
                    };
                }
                return t;
            });
            localStorage.setItem('demo_tenants', JSON.stringify(updatedTenants));

            onComplete();
        } catch(e) {
            console.error("Demo save error", e);
            alert("Failed to save in demo mode");
        }
        return;
    }
    // --------------------------

    try {
      const batchData = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        rentIncluded: includeRent,
        lastReading: tenant.lastReading,
        lastReadingDate: tenant.lastReadingDate,
        latestReading: parseFloat(latestReading),
        latestReadingDate: Timestamp.fromDate(new Date(billDate)),
        unitsUsed: calculated.unitsUsed,
        rate: parseFloat(rate),
        electricityAmount: calculated.elecAmount,
        rentAmount: calculated.rentAmount,
        totalAmount: calculated.totalAmount,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'bills'), batchData);

      await updateDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'tenants', tenant.id), {
        lastReading: parseFloat(latestReading),
        lastReadingDate: Timestamp.fromDate(new Date(billDate))
      });
      
      onComplete();
    } catch (err) {
      console.error("Error saving bill:", err);
      alert("Failed to save bill");
    }
  };

  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="bg-white min-h-full p-4 pb-24 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">Generate Bill</h2>
      </div>

      <div className="mb-6 bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
        <p className="text-xs text-blue-600 uppercase tracking-wide font-bold mb-1">Tenant</p>
        <p className="text-xl font-bold text-gray-900">{tenant.name}</p>
        <div className="flex justify-between mt-3 text-sm text-gray-700 bg-white/50 p-2 rounded-lg">
          <span>Previous: <strong className="text-gray-900">{tenant.lastReading}</strong></span>
          <span>Rent: <strong className="text-gray-900">{formatCurrency(tenant.rent)}</strong></span>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latest Reading</label>
          <input 
            type="number" 
            step="0.1"
            value={latestReading}
            onChange={e => {
              setLatestReading(e.target.value);
              setCalculated(null);
            }}
            className="w-full p-4 border border-gray-300 rounded-xl text-2xl font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder={String(tenant.lastReading + 10)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
             <input 
              type="date" 
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Rate (₹)</label>
             <input 
              type="number" 
              value={rate}
              onChange={e => {
                setRate(e.target.value);
                setCalculated(null);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 bg-gray-50 p-3 rounded-lg">
          <input 
            type="checkbox" 
            id="rentCheck" 
            checked={includeRent} 
            onChange={e => {
              setIncludeRent(e.target.checked);
              setCalculated(null);
            }}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
          />
          <label htmlFor="rentCheck" className="text-gray-700 font-medium select-none">Include Rent Amount</label>
        </div>

        {!calculated ? (
          <button 
            onClick={handleCalculate}
            disabled={!latestReading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed mt-6 shadow-lg shadow-blue-200"
          >
            Calculate Bill
          </button>
        ) : (
          <div className="animate-fade-in mt-8">
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-md mb-6 font-mono text-sm text-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
              <div className="text-center border-b border-gray-100 pb-3 mb-4">
                <p className="font-bold text-lg tracking-tight text-gray-900">BILL PREVIEW</p>
                <p className="text-xs text-gray-400 uppercase">Home Bills Tracker</p>
              </div>
              <div className="flex justify-between mb-2">
                <span>Date:</span>
                <span>{formatDate(calculated.currentDate)}</span>
              </div>
              <div className="flex justify-between mb-4">
                 <span>Tenant:</span>
                 <span className="font-bold text-black">{tenant.name}</span>
              </div>
              
              <div className="space-y-2 text-gray-600">
                 <div className="flex justify-between">
                   <span>Prev: {tenant.lastReading}</span>
                   <span className="text-xs text-gray-400">({formatDate(calculated.previousDate)})</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Curr: {latestReading}</span>
                   <span className="text-xs text-gray-400">({formatDate(calculated.currentDate)})</span>
                 </div>
                 <div className="flex justify-between font-bold text-black bg-gray-50 p-1 rounded">
                   <span>Units: {calculated.unitsUsed.toFixed(1)}</span>
                   <span>@ ₹{rate}/u</span>
                 </div>
              </div>
              
              <div className="border-t border-dashed border-gray-300 my-4"></div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                    <span>Electricity</span>
                    <span>{formatCurrency(calculated.elecAmount)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Rent</span>
                    <span>{formatCurrency(calculated.rentAmount)}</span>
                </div>
              </div>
              
              <div className="border-t-2 border-gray-900 pt-3 mt-3 flex justify-between items-center text-xl font-bold text-black">
                <span>TOTAL DUE</span>
                <span>{formatCurrency(calculated.totalAmount)}</span>
              </div>
            </div>

            {/* AI Usage Analysis */}
            <div className="mb-6">
               {!aiInsight ? (
                 <button 
                  onClick={handleAnalyzeUsage}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm"
                 >
                   {isAnalyzing ? (
                     <span className="animate-spin rounded-full h-4 w-4 border-2 border-purple-700 border-t-transparent"></span>
                   ) : (
                     <Sparkles size={18} />
                   )}
                   {isAnalyzing ? "Analyzing..." : "Analyze Usage with AI"}
                 </button>
               ) : (
                 <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-xl text-sm text-purple-900 flex gap-3 animate-fade-in shadow-sm">
                   <Sparkles className="shrink-0 text-purple-600 mt-0.5" size={20} />
                   <p className="leading-relaxed">{aiInsight}</p>
                 </div>
               )}
            </div>

            <div className="flex flex-col gap-3">
                <button 
                onClick={handleSave}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                >
                <Save size={20} /> Confirm & Save
                </button>
                <button 
                onClick={() => setCalculated(null)}
                className="w-full py-3 text-gray-500 hover:text-gray-800 text-sm font-medium"
                >
                Edit Inputs
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};