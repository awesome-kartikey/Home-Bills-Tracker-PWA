import React, { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

interface MobileNumberPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (value: string) => void;
    initialValue: string;
}

const INTEGERS = Array.from({ length: 100 }, (_, i) => i);
const DECIMALS = ['00', '25', '50', '75'];
const ITEM_HEIGHT = 48; // Height of each item in pixels

export const MobileNumberPicker: React.FC<MobileNumberPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    initialValue,
}) => {
    const [selectedInt, setSelectedInt] = useState(0);
    const [selectedDec, setSelectedDec] = useState('00');

    const intRef = useRef<HTMLDivElement>(null);
    const decRef = useRef<HTMLDivElement>(null);

    // Initialize from props
    useEffect(() => {
        if (isOpen) {
            const val = parseFloat(initialValue || '0');
            const intPart = Math.floor(val);
            // Find closest decimal
            const decPartVal = (val - intPart).toFixed(2).substring(2); // "25", "50" etc

            // Match to closest available decimal
            let bestDec = '00';
            if (DECIMALS.includes(decPartVal)) {
                bestDec = decPartVal;
            } else {
                // Fallback or logic to find closest? 
                // For now assume input matches or default to 00
                // If value is 1.5, decPartVal is "50".
            }

            setSelectedInt(intPart);
            setSelectedDec(bestDec);

            // Scroll to position after a short delay to allow render
            setTimeout(() => {
                if (intRef.current) {
                    intRef.current.scrollTop = intPart * ITEM_HEIGHT;
                }
                if (decRef.current) {
                    const decIndex = DECIMALS.indexOf(bestDec);
                    if (decIndex !== -1) {
                        decRef.current.scrollTop = decIndex * ITEM_HEIGHT;
                    }
                }
            }, 10);
        }
    }, [isOpen, initialValue]);

    const handleScroll = (
        e: React.UIEvent<HTMLDivElement>,
        items: any[],
        setFn: (val: any) => void
    ) => {
        const scrollTop = e.currentTarget.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        if (items[index] !== undefined) {
            setFn(items[index]);
        }
    };

    const handleConfirm = () => {
        const finalValue = `${selectedInt}.${selectedDec}`;
        onSelect(parseFloat(finalValue).toString()); // Remove trailing zeros if needed, or keep as string
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Picker Card */}
            <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-800">Select Quantity</h3>
                    <button
                        onClick={handleConfirm}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors font-bold"
                    >
                        <Check size={20} />
                    </button>
                </div>

                {/* Picker Area */}
                <div className="relative h-64 flex justify-center bg-white">

                    {/* Center Highlight Bar */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-12 bg-blue-50 border-y border-blue-100 pointer-events-none z-0" />

                    {/* Gradients for depth */}
                    <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

                    {/* Columns Container */}
                    <div className="flex w-full px-8 gap-4 z-0">

                        {/* Integers Column */}
                        <div className="flex-1 relative">
                            <div
                                ref={intRef}
                                onScroll={(e) => handleScroll(e, INTEGERS, setSelectedInt)}
                                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[104px]" // (256 - 48) / 2 = 104px padding
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {INTEGERS.map((num) => (
                                    <div
                                        key={num}
                                        className={`h-12 flex items-center justify-center snap-center transition-all duration-200 ${selectedInt === num
                                                ? 'text-2xl font-bold text-blue-600 scale-110'
                                                : 'text-lg text-gray-400'
                                            }`}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Decimal Column */}
                        <div className="flex-1 relative">
                            <div
                                ref={decRef}
                                onScroll={(e) => handleScroll(e, DECIMALS, setSelectedDec)}
                                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[104px]"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {DECIMALS.map((dec) => (
                                    <div
                                        key={dec}
                                        className={`h-12 flex items-center justify-center snap-center transition-all duration-200 ${selectedDec === dec
                                                ? 'text-2xl font-bold text-blue-600 scale-110'
                                                : 'text-lg text-gray-400'
                                            }`}
                                    >
                                        .{dec}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Current Value Preview */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <span className="text-sm text-gray-500 uppercase tracking-wider font-medium">Selected: </span>
                    <span className="text-xl font-bold text-gray-900">{selectedInt}.{selectedDec} L</span>
                </div>

                {/* Confirm Button (Mobile friendly large button) */}
                <div className="p-4 pt-0 bg-gray-50">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                        Confirm
                    </button>
                </div>

            </div>
        </div>
    );
};
