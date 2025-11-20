import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase';
import { Tenant } from '../types';
import { Users, Plus, Calculator, Trash2 } from 'lucide-react';

interface TenantsViewProps {
  userId: string;
  onGenerateBill: (tenant: Tenant) => void;
}

// Helper for Demo Mode Timestamps
const createMockTimestamp = (seconds: number) => ({
  seconds,
  nanoseconds: 0,
  toDate: () => new Date(seconds * 1000)
} as Timestamp);

export const TenantsView: React.FC<TenantsViewProps> = ({ userId, onGenerateBill }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newName, setNewName] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newReading, setNewReading] = useState('');

  useEffect(() => {
    if (!userId) return;

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
      const stored = localStorage.getItem('demo_tenants');
      if (stored) {
        // Revive timestamps
        const parsed = JSON.parse(stored).map((t: any) => ({
            ...t,
            lastReadingDate: createMockTimestamp(t.lastReadingDate.seconds),
            createdAt: createMockTimestamp(t.createdAt.seconds)
        }));
        setTenants(parsed);
      } else {
        // Default Demo Data
        const demoData = [{
            id: 'demo_1',
            name: 'Alice (Demo)',
            rent: 5000,
            lastReading: 1000,
            lastReadingDate: createMockTimestamp(Math.floor(Date.now()/1000) - 86400*30),
            createdAt: createMockTimestamp(Math.floor(Date.now()/1000))
        }];
        setTenants(demoData);
        localStorage.setItem('demo_tenants', JSON.stringify(demoData));
      }
      setLoading(false);
      return;
    }
    // --------------------------

    const q = collection(db, 'artifacts', APP_ID, 'users', userId, 'tenants');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
        setTenants(list);
        setLoading(false);
      },
      (error) => console.error("Error fetching tenants:", error)
    );
    return () => unsubscribe();
  }, [userId]);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newRent || !newReading) return;

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
        const newTenant = {
            id: 'demo_' + Date.now(),
            name: newName,
            rent: parseFloat(newRent),
            lastReading: parseFloat(newReading),
            lastReadingDate: createMockTimestamp(Math.floor(Date.now()/1000)),
            createdAt: createMockTimestamp(Math.floor(Date.now()/1000))
        };
        const updated = [...tenants, newTenant];
        setTenants(updated);
        localStorage.setItem('demo_tenants', JSON.stringify(updated));
        setIsAdding(false);
        setNewName('');
        setNewRent('');
        setNewReading('');
        return;
    }
    // --------------------------

    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'tenants'), {
        name: newName,
        rent: parseFloat(newRent),
        lastReading: parseFloat(newReading),
        lastReadingDate: Timestamp.now(),
        createdAt: Timestamp.now()
      });
      setIsAdding(false);
      setNewName('');
      setNewRent('');
      setNewReading('');
    } catch (err) {
      console.error("Error adding tenant:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if(window.confirm("Delete this tenant? This action cannot be undone.")) {
      // --- DEMO MODE FALLBACK ---
      if (userId === 'local-demo-user') {
        const updated = tenants.filter(t => t.id !== id);
        setTenants(updated);
        localStorage.setItem('demo_tenants', JSON.stringify(updated));
        return;
      }
      // --------------------------
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'tenants', id));
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatDate = (ts: Timestamp) => ts ? ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-4 pb-20">
      {isAdding ? (
        <div className="bg-white p-5 rounded-xl shadow-lg border border-blue-100 animate-fade-in">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Add New Tenant</h3>
          <form onSubmit={handleAddTenant} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Name</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. John Doe"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rent (₹)</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="5000"
                  value={newRent}
                  onChange={e => setNewRent(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Initial Reading</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0"
                  value={newReading}
                  onChange={e => setNewReading(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium shadow-md transition-colors">Save Tenant</button>
            </div>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
        >
          <Plus size={20} /> Add Tenant
        </button>
      )}

      <div className="space-y-3">
        {tenants.length === 0 && !isAdding && (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tenants yet. Add one to get started.</p>
          </div>
        )}
        {tenants.map(tenant => (
          <div key={tenant.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{tenant.name}</h3>
              <div className="text-sm text-gray-500 mt-1 flex flex-col gap-0.5">
                <p>Rent: <span className="font-medium text-gray-700">{formatCurrency(tenant.rent)}</span></p>
                <p>Last Reading: <span className="font-medium text-gray-700">{tenant.lastReading}</span> <span className="text-xs opacity-60 ml-1">({formatDate(tenant.lastReadingDate)})</span></p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
               <button 
                onClick={() => onGenerateBill(tenant)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Calculator size={16} /> Bill
              </button>
              <button 
                onClick={() => handleDelete(tenant.id)}
                className="text-gray-400 hover:text-red-500 p-1.5 transition-colors rounded-full hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};