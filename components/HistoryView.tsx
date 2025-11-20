import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase';
import { callGemini } from '../services/gemini';
import { Bill } from '../types';
import { FileText, Share2, ChevronRight, X, Image as ImageIcon, Sparkles, Copy } from 'lucide-react';

interface HistoryViewProps {
  userId: string;
}

// Helper for Demo Mode Timestamps
const createMockTimestamp = (seconds: number) => ({
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000)
} as Timestamp);

export const HistoryView: React.FC<HistoryViewProps> = ({ userId }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  
  // AI Message State
  const [drafting, setDrafting] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // --- DEMO MODE FALLBACK ---
    if (userId === 'local-demo-user') {
        const stored = localStorage.getItem('demo_bills');
        if (stored) {
            const parsed = JSON.parse(stored).map((b: any) => ({
                ...b,
                lastReadingDate: createMockTimestamp(b.lastReadingDate.seconds),
                latestReadingDate: createMockTimestamp(b.latestReadingDate.seconds),
                createdAt: createMockTimestamp(b.createdAt.seconds)
            }));
            parsed.sort((a: Bill, b: Bill) => b.createdAt.seconds - a.createdAt.seconds);
            setBills(parsed);
        }
        setLoading(false);
        return;
    }
    // --------------------------

    const q = collection(db, 'artifacts', APP_ID, 'users', userId, 'bills');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
        list.sort((a, b) => {
            // Handle timestamps safely
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        setBills(list);
        setLoading(false);
      },
      (error) => console.error("Error fetching bills:", error)
    );
    return () => unsubscribe();
  }, [userId]);

  const formatDate = (ts: Timestamp | Date) => {
    if (!ts) return '-';
    const d = ts instanceof Timestamp ? ts.toDate() : ts;
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getBillText = (bill: Bill) => {
     const prevDate = formatDate(bill.lastReadingDate);
    const currDate = formatDate(bill.latestReadingDate);

    return `
🧾 ELECTRICITY BILL
--------------------------------
Date: ${formatDate(bill.createdAt)}
Tenant: ${bill.tenantName}
--------------------------------
READINGS
Previous: ${bill.lastReading} (${prevDate})
Current : ${bill.latestReading} (${currDate})
Units   : ${bill.unitsUsed.toFixed(2)}
Rate    : ₹${bill.rate}/unit
--------------------------------
CHARGES
Electricity : ${formatCurrency(bill.electricityAmount)}
Rent        : ${formatCurrency(bill.rentAmount)}
--------------------------------
TOTAL DUE   : ${formatCurrency(bill.totalAmount)}
--------------------------------
    `.trim();
  };

  const shareAsImage = async (billId: string) => {
    // Using global html2canvas from CDN
    if (!(window as any).html2canvas) {
      alert("Image generator is loading, please try again in a moment.");
      return;
    }

    setGeneratingImage(true);
    const element = document.getElementById(`bill-card-${billId}`);
    
    if (element) {
      try {
        const canvas = await (window as any).html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2, 
          logging: false
        });

        canvas.toBlob(async (blob: Blob | null) => {
          if (!blob) return;
          const file = new File([blob], `bill-${billId}.png`, { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Electricity Bill',
                text: 'Here is the electricity bill.'
              });
            } catch (err) {
              console.error("Share failed:", err);
            }
          } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `bill-${billId}.png`;
            link.click();
          }
          setGeneratingImage(false);
        }, 'image/png');
      } catch (err) {
        console.error("Image generation failed:", err);
        setGeneratingImage(false);
        alert("Failed to generate image.");
      }
    } else {
      setGeneratingImage(false);
    }
  };

  const handleAiDraft = async (bill: Bill) => {
    setDrafting(true);
    setShowDraftModal(true);
    setDraftMessage("Thinking...");
    
    const prompt = `
      Write a polite, friendly WhatsApp message to my tenant ${bill.tenantName}.
      
      Details:
      - Bill Date: ${formatDate(bill.createdAt)}
      - Total Amount: ${formatCurrency(bill.totalAmount)}
      - Electricity Units: ${bill.unitsUsed.toFixed(1)} units
      - Reading Period: ${formatDate(bill.lastReadingDate)} to ${formatDate(bill.latestReadingDate)}
      
      The message should:
      1. Clearly state the total amount due.
      2. Mention the electricity usage.
      3. Politely ask for payment.
      4. Use appropriate emojis.
      5. Be concise (max 50 words).
    `;
    
    const result = await callGemini(prompt);
    setDraftMessage(result);
    setDrafting(false);
  };

  const copyToClipboard = (text: string | null) => {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    });
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 pl-1">Bill History</h2>
      
      {bills.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={64} className="mx-auto mb-4 opacity-20" />
          <p>No bills generated yet.</p>
        </div>
      )}

      {bills.map(bill => (
        <div key={bill.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-700 p-2 rounded-lg font-bold text-xs flex flex-col items-center min-w-[50px]">
                <span className="text-lg leading-none">{bill.createdAt?.toDate().getDate()}</span>
                <span className="uppercase text-[10px]">{bill.createdAt?.toDate().toLocaleString('default', { month: 'short' })}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{bill.tenantName}</h3>
                <p className="text-xs text-gray-500">Units: {bill.unitsUsed.toFixed(1)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{formatCurrency(bill.totalAmount)}</p>
              <div className="flex justify-end">
                 {expandedBill === bill.id ? <X size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </div>
          </div>

          {expandedBill === bill.id && (
            <div className="bg-gray-50 p-4 border-t border-gray-100 animate-fade-in">
               {/* Wrapper for capture */}
               <div id={`bill-card-${bill.id}`} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4 text-sm font-mono text-gray-700">
                  <div className="text-center border-b border-gray-100 pb-3 mb-3">
                    <p className="font-bold text-lg text-blue-600">ELECTRICITY BILL</p>
                    <p className="text-xs text-gray-400">Home Bills Tracker</p>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Date:</span>
                    <span>{formatDate(bill.createdAt)}</span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span>Tenant:</span>
                    <span className="font-bold text-black">{bill.tenantName}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-gray-300 my-2"></div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Prev <span className="text-[10px] text-gray-400 font-sans">({formatDate(bill.lastReadingDate)})</span></span>
                      <span>{bill.lastReading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Curr <span className="text-[10px] text-gray-400 font-sans">({formatDate(bill.latestReadingDate)})</span></span>
                      <span>{bill.latestReading}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800 pt-1">
                      <span>Units Consumed</span>
                      <span>{bill.unitsUsed.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-300 my-2"></div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Elec Charges</span>
                      <span>{formatCurrency(bill.electricityAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rent</span>
                      <span>{formatCurrency(bill.rentAmount)}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-gray-900 pt-2 mt-3 flex justify-between items-center text-xl font-bold text-black">
                    <span>TOTAL</span>
                    <span>{formatCurrency(bill.totalAmount)}</span>
                  </div>
               </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button 
                  onClick={() => copyToClipboard(getBillText(bill))}
                  className="bg-white border border-gray-300 py-2.5 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
                >
                  <Share2 size={16} /> Copy Text
                </button>
                <button 
                  onClick={() => shareAsImage(bill.id)}
                  disabled={generatingImage}
                  className="bg-blue-600 text-white py-2.5 rounded-lg shadow-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                >
                  {generatingImage ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  ) : (
                    <ImageIcon size={16} />
                  )}
                  {generatingImage ? 'Gen...' : 'Save Image'}
                </button>
              </div>
              
              <button 
                onClick={() => handleAiDraft(bill)}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg shadow-md font-bold hover:opacity-90 flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles size={16} /> Draft WhatsApp Message
              </button>
            </div>
          )}
        </div>
      ))}
      
      {/* AI Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2 text-lg"><Sparkles size={20}/> AI Drafter</h3>
              <button onClick={() => setShowDraftModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[120px] text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {drafting ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-500 gap-3">
                    <span className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></span>
                    <span className="text-xs font-medium">Writing message...</span>
                  </div>
                ) : draftMessage}
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setShowDraftModal(false)} className="flex-1 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Close</button>
                <button 
                  disabled={drafting}
                  onClick={() => { copyToClipboard(draftMessage); setShowDraftModal(false); }}
                  className="flex-1 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Copy size={16} /> Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};