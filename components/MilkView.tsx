import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase';
import { MilkData } from '../types';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { MobileNumberPicker } from './MobileNumberPicker';

interface MilkViewProps {
  userId: string;
}

export const MilkView: React.FC<MilkViewProps> = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [milkData, setMilkData] = useState<MilkData>({});
  const [milkRate, setMilkRate] = useState(60);
  const [addQty, setAddQty] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!userId) return;

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
      const storedSettings = localStorage.getItem('demo_settings');
      if (storedSettings) setMilkRate(JSON.parse(storedSettings).milkRate || 60);

      const storedMilk = localStorage.getItem(`demo_milk_${monthStr}`);
      if (storedMilk) setMilkData(JSON.parse(storedMilk));
      else setMilkData({});
      return;
    }
    // --------------------------

    // 1. Settings
    const unsubSettings = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', userId, 'settings', 'global'), docSnap => {
      if (docSnap.exists()) setMilkRate(docSnap.data().milkRate || 60);
    });

    // 2. Milk Month Doc
    const unsubMilk = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', userId, 'milk', monthStr), docSnap => {
      if (docSnap.exists()) {
        setMilkData(docSnap.data().days || {});
      } else {
        setMilkData({});
      }
    });

    return () => {
      unsubSettings();
      unsubMilk();
    };
  }, [userId, monthStr]);

  const handleAddMilk = async () => {
    const qty = parseFloat(addQty);
    if (!qty || isNaN(qty)) return;

    const currentEntries = milkData[selectedDay] || [];
    const newEntries = [...currentEntries, qty];
    const newDays = { ...milkData, [selectedDay]: newEntries };

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
      setMilkData(newDays);
      localStorage.setItem(`demo_milk_${monthStr}`, JSON.stringify(newDays));
      setAddQty('');
      return;
    }
    // --------------------------

    await setDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'milk', monthStr), {
      days: newDays
    }, { merge: true });

    setAddQty('');
  };

  const handleDeleteEntry = async (dateKey: string, index: number) => {
    if (!window.confirm('Remove this entry?')) return;
    const currentEntries = [...(milkData[dateKey] || [])];
    currentEntries.splice(index, 1);

    const newDays = { ...milkData };
    if (currentEntries.length === 0) {
      delete newDays[dateKey];
    } else {
      newDays[dateKey] = currentEntries;
    }

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
      setMilkData(newDays);
      localStorage.setItem(`demo_milk_${monthStr}`, JSON.stringify(newDays));
      return;
    }
    // --------------------------

    await setDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'milk', monthStr), {
      days: newDays
    }, { merge: true });
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const totalLiters = Object.values(milkData).reduce<number>((acc, daily: any) => {
    const dayTotal = (daily as number[]).reduce((sum: number, val: number) => sum + val, 0);
    return acc + dayTotal;
  }, 0);

  const totalCost = totalLiters * milkRate;

  return (
    <div className="space-y-4 h-full flex flex-col pb-20">
      {/* Month Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-blue-100 sticky top-0 z-10">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h2 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <p className="text-xs text-gray-500 font-medium">Rate: ₹{milkRate}/L</p>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowRight size={20} /></button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex justify-around items-center">
        <div className="text-center">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">Total Liters</p>
          <p className="text-3xl font-bold">{totalLiters}</p>
        </div>
        <div className="h-10 w-px bg-white/20"></div>
        <div className="text-center">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wide mb-1">Total Cost</p>
          <p className="text-3xl font-bold">₹{totalCost.toFixed(0)}</p>
        </div>
      </div>

      {/* Add Entry Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3 items-center">
        <input
          type="date"
          value={selectedDay}
          onChange={e => setSelectedDay(e.target.value)}
          className="border border-gray-300 rounded-lg p-3 text-sm w-36 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="relative flex-1">
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 pl-3 bg-white cursor-pointer flex items-center h-[46px]"
          >
            <span className={`text-base ${addQty ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {addQty || 'Qty'}
            </span>
          </div>
          <span className="absolute right-3 top-3 text-gray-400 text-xs font-medium pointer-events-none">L</span>
        </div>

        <button
          onClick={handleAddMilk}
          disabled={!addQty}
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 shadow-md transition-transform active:scale-95 disabled:bg-gray-300"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* List of Days */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {Object.keys(milkData).sort().reverse().map(dateKey => {
          const entries = milkData[dateKey];
          const dayTotal = entries.reduce((a, b) => a + b, 0);
          const dateObj = new Date(dateKey);

          return (
            <div key={dateKey} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-start shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg font-bold text-sm w-12 text-center flex flex-col leading-none">
                  <span className="text-lg">{dateObj.getDate()}</span>
                  <span className="text-[10px] uppercase">{dateObj.toLocaleDateString('default', { weekday: 'short' })}</span>
                </div>
                <div>
                  <div className="flex gap-2 flex-wrap">
                    {entries.map((qty, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDeleteEntry(dateKey, idx)}
                        className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Tap to delete"
                      >
                        {qty} L
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="font-bold text-gray-900 text-lg">{dayTotal} <span className="text-xs text-gray-400 font-medium">L</span></div>
            </div>
          );
        })}
        {Object.keys(milkData).length === 0 && (
          <div className="text-center text-gray-400 py-10">No entries for this month</div>
        )}
      </div>
      <MobileNumberPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(val) => setAddQty(val)}
        initialValue={addQty}
      />
    </div>
  );
};