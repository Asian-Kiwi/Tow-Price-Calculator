/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, ReactNode, useRef } from "react";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Wrench, 
  Layers, 
  Navigation, 
  Info,
  ChevronRight,
  TrendingDown,
  InfoIcon,
  Download,
  Camera,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import download from "downloadjs";

// Initial Rates
const INITIAL_RATES = {
  BASE_HOOKUP: 180.00,
  EXTRA_KM: 4.50,
  LONG_DISTANCE_DISCOUNT: -0.50,
  AFTER_HOURS: 120.00,
  WINCH_RECOVERY: 95.00,
  TOLLS: 18.50,
  SPECIAL_EQUIPMENT: 55.00
};

export default function App() {
  const [rates, setRates] = useState(INITIAL_RATES);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({});
  const [totalKm, setTotalKm] = useState<number>(0);
  const [isAfterHours, setIsAfterHours] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isSpecialEquipment, setIsSpecialEquipment] = useState(false);
  const [isTolls, setIsTolls] = useState(false);
  const [cashDiscountPercent, setCashDiscountPercent] = useState(20);
  
  const captureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleRateChange = (key: keyof typeof INITIAL_RATES, value: string) => {
    const num = parseFloat(value) || 0;
    setRates(prev => ({ ...prev, [key]: num }));
  };

  const handleQuantityChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setItemQuantities(prev => ({ ...prev, [id]: num }));
  };

  const handleDescriptionChange = (id: string, value: string) => {
    setItemDescriptions(prev => ({ ...prev, [id]: value }));
  };

  const exportScreenshot = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: '#E4E3E0',
        pixelRatio: 2,
        style: {
          borderRadius: '0px'
        }
      });
      download(dataUrl, `Towing-Quote-${new Date().toISOString().split('T')[0]}.png`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const pricingItems = useMemo(() => {
    const items = [];

    // 1. Base Hook-up
    items.push({
      id: "base",
      rateKey: "BASE_HOOKUP" as const,
      name: "Base Hook-up Fee",
      quantity: itemQuantities["base"] ?? 1,
      unitRate: rates.BASE_HOOKUP,
      description: itemDescriptions["base"] ?? "Standard loading and first 10km travel",
      total: (itemQuantities["base"] ?? 1) * rates.BASE_HOOKUP
    });

    // 2. Extra Distance
    const extraKmDefault = Math.max(0, totalKm - 10);
    const extraKmValue = itemQuantities["extra-km"] ?? extraKmDefault;
    if (extraKmValue > 0 || totalKm > 10) {
      items.push({
        id: "extra-km",
        rateKey: "EXTRA_KM" as const,
        name: "Extra Distance",
        quantity: extraKmValue,
        unitRate: rates.EXTRA_KM,
        description: itemDescriptions["extra-km"] ?? "Distance exceeding 10km base allowance",
        total: extraKmValue * rates.EXTRA_KM
      });
    }

    // 3. Long Distance Discount
    const discountKmDefault = Math.max(0, totalKm - 100);
    const discountKmValue = itemQuantities["long-distance"] ?? discountKmDefault;
    if (discountKmValue > 0 || totalKm > 100) {
      items.push({
        id: "long-distance",
        rateKey: "LONG_DISTANCE_DISCOUNT" as const,
        name: "Long Distance Discount",
        quantity: discountKmValue,
        unitRate: rates.LONG_DISTANCE_DISCOUNT,
        isDiscount: true,
        description: itemDescriptions["long-distance"] ?? "Applied to trips exceeding 100km",
        total: discountKmValue * rates.LONG_DISTANCE_DISCOUNT
      });
    }

    // 4. After Hours
    if (isAfterHours) {
      const q = itemQuantities["after-hours"] ?? 1;
      items.push({
        id: "after-hours",
        rateKey: "AFTER_HOURS" as const,
        name: "After-Hours Support",
        quantity: q,
        unitRate: rates.AFTER_HOURS,
        description: itemDescriptions["after-hours"] ?? "Service outside 8AM-5PM or weekends",
        total: q * rates.AFTER_HOURS
      });
    }

    // 5. Winch / Recovery
    if (isRecovery) {
      const q = itemQuantities["recovery"] ?? 1;
      items.push({
        id: "recovery",
        rateKey: "WINCH_RECOVERY" as const,
        name: "Winch / Recovery",
        quantity: q,
        unitRate: rates.WINCH_RECOVERY,
        description: itemDescriptions["recovery"] ?? "Hydraulic winch for bogged vehicles",
        total: q * rates.WINCH_RECOVERY
      });
    }

    // 6. Tolls
    if (isTolls) {
      const q = itemQuantities["tolls"] ?? 1;
      items.push({
        id: "tolls",
        rateKey: "TOLLS" as const,
        name: "Tolls & Levies",
        quantity: q,
        unitRate: rates.TOLLS,
        description: itemDescriptions["tolls"] ?? "Gateway / Logan Motorway recovery tolls",
        total: q * rates.TOLLS
      });
    }

    // 7. Special Equipment
    if (isSpecialEquipment) {
      const q = itemQuantities["special-equip"] ?? 1;
      items.push({
        id: "special-equip",
        rateKey: "SPECIAL_EQUIPMENT" as const,
        name: "Specialized Equipment",
        quantity: q,
        unitRate: rates.SPECIAL_EQUIPMENT,
        description: itemDescriptions["special-equip"] ?? "Dolly wheels for AWD/locked vehicle",
        total: q * rates.SPECIAL_EQUIPMENT
      });
    }

    return items;
  }, [totalKm, isAfterHours, isRecovery, isSpecialEquipment, isTolls, rates, itemQuantities]);

  const subtotal = pricingItems.reduce((acc, item) => acc + item.total, 0);
  
  // Standard Calculation (Includes GST)
  const gst = subtotal * 0.10;
  const standardTotal = subtotal + gst;

  // Cash Calculation (Solo Operator Discount, No GST implied/added to the discounted subtotal)
  const cashDiscountAmount = subtotal * (cashDiscountPercent / 100);
  const cashNetTotal = subtotal - cashDiscountAmount;

  return (
    <div className="min-h-screen bg-high-density-bg flex flex-col items-center p-0 sm:p-4 md:p-8">
      <div 
        ref={captureRef}
        className="w-full max-w-5xl bg-white border border-high-density-fg shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Subtle Brand Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none -rotate-12 select-none">
          <Truck size={600} />
        </div>

        {/* Header */}
        <header className="h-24 border-b border-high-density-fg flex items-center justify-between px-10 bg-high-density-fg text-high-density-bg shrink-0 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck size={14} className="text-high-density-accent" />
              <h1 className="text-[10px] font-mono tracking-[0.2em] uppercase opacity-70">Operations Management // Quoting Engine</h1>
            </div>
            <p className="text-3xl font-black tracking-tight uppercase leading-tight">
              Towing Pricing <span className="text-high-density-accent">Calculator</span> 
              <span className="font-light opacity-30 ml-3 text-xl">/ v2.5.0 PRO</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono uppercase opacity-50 mb-1 tracking-widest">Fleet Reference</p>
            <p className="text-base font-bold uppercase tracking-wider border-t border-high-density-bg/20 pt-1">Hino 500 FD - Unit 08</p>
          </div>
        </header>

        {/* Input Variables Section */}
        <section className="grid grid-cols-2 md:grid-cols-5 border-b border-high-density-fg bg-white shrink-0 relative z-10">
          <div className="border-r border-high-density-fg p-6 flex flex-col justify-between bg-white text-high-density-fg group">
            <label className="text-[10px] font-mono uppercase opacity-50 font-bold mb-2 group-hover:opacity-100 transition-opacity">
              <MapPin size={10} className="inline mr-1 -mt-0.5" /> Total Distance
            </label>
            <div className="flex items-end justify-between relative">
              <input
                type="number"
                min="0"
                value={totalKm || ""}
                onChange={(e) => setTotalKm(parseFloat(e.target.value) || 0)}
                className="w-full text-5xl font-bold font-mono bg-transparent border-none focus:ring-0 p-0 outline-none placeholder:opacity-10 hover:bg-black/[0.02] transition-colors"
                placeholder="0.0"
              />
              <span className="text-xs font-black pb-2 uppercase absolute right-0 pointer-events-none opacity-40">KM</span>
            </div>
          </div>

          <ToggleBox 
            id="after-hours-btn"
            active={isAfterHours} 
            onToggle={() => setIsAfterHours(!isAfterHours)} 
            label="After Hours?" 
          />
          <ToggleBox 
            id="recovery-btn"
            active={isRecovery} 
            onToggle={() => setIsRecovery(!isRecovery)} 
            label="Recovery Req." 
          />
          <ToggleBox 
            id="special-btn"
            active={isSpecialEquipment} 
            onToggle={() => setIsSpecialEquipment(!isSpecialEquipment)} 
            label="Special Equip." 
          />
          <ToggleBox 
            id="tolls-btn"
            active={isTolls} 
            onToggle={() => setIsTolls(!isTolls)} 
            label="Tolls Incurred?" 
            isLast
          />
        </section>

        {/* Dynamic Pricing Table */}
        <main className="flex-1 flex flex-col relative z-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_2.5fr_1fr] bg-high-density-fg/5 text-[11px] font-serif italic py-4 px-10 border-b border-high-density-fg uppercase tracking-wider">
            <div className="opacity-60">Service Item</div>
            <div className="text-center opacity-60">Quantity/Unit</div>
            <div className="text-right opacity-60">Rate ($)</div>
            <div className="pl-12 opacity-60">Customer Description</div>
            <div className="text-right opacity-60">Total ($)</div>
          </div>
          
          <div className="flex-1 overflow-auto font-mono text-sm min-h-[300px]">
            <AnimatePresence initial={false}>
              {pricingItems.length > 0 ? (
                pricingItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    id={`item-${item.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="grid grid-cols-[2fr_1fr_1fr_2.5fr_1fr] border-b border-high-density-fg/5 py-5 px-10 hover:bg-high-density-fg/[0.02] transition-colors group items-center"
                  >
                    <div className="font-black uppercase tracking-tight text-high-density-fg/80 group-hover:text-high-density-fg transition-colors">
                      {item.name}
                    </div>
                    <div className="text-center">
                       <input 
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-16 text-center bg-transparent border-b border-transparent hover:border-high-density-fg/20 focus:border-high-density-accent focus:ring-0 p-0 font-bold transition-all outline-none opacity-60 focus:opacity-100"
                        />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end group/rate">
                        <span className="text-[10px] opacity-20 mr-1">$</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={item.unitRate}
                          onChange={(e) => handleRateChange(item.rateKey, e.target.value)}
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-high-density-fg/20 focus:border-high-density-accent focus:ring-0 p-0 font-bold transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div className="pl-12">
                       <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                          className="w-full text-xs font-sans italic opacity-40 group-hover:opacity-100 transition-opacity bg-transparent border-b border-transparent hover:border-high-density-fg/20 focus:border-high-density-accent focus:ring-0 p-0 outline-none leading-relaxed"
                          placeholder="Add description..."
                        />
                    </div>
                    <div className={`text-right font-black text-base ${item.isDiscount ? "text-high-density-accent" : ""}`}>
                      {item.isDiscount ? "- " : ""}${Math.abs(item.total).toFixed(2)}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center p-20 text-center flex-col opacity-10 select-none">
                  <Truck size={120} className="mb-6" />
                  <p className="font-mono text-sm uppercase tracking-[0.5em] font-black">Awaiting operation parameters...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Summary Footer */}
        <footer className="h-auto border-t-2 border-high-density-fg grid grid-cols-1 md:grid-cols-4 bg-white shrink-0 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          {/* Section 1: Subtotal/GST */}
          <div className="border-r border-high-density-fg p-6 flex flex-col justify-center bg-white space-y-3">
            <div className="flex justify-between items-end border-b border-high-density-fg/10 pb-1">
              <p className="text-[9px] font-mono uppercase opacity-40 tracking-widest">Service Subtotal</p>
              <p className="text-lg font-mono font-bold tracking-tighter">${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-end">
              <p className="text-[9px] font-mono uppercase opacity-40 tracking-widest font-black">GST (10%)</p>
              <p className="text-lg font-mono font-bold tracking-tighter">${gst.toFixed(2)}</p>
            </div>
          </div>

          {/* Section 2: Total Amount with GST */}
          <div className="border-r border-high-density-fg p-6 flex flex-col justify-center bg-high-density-fg text-high-density-bg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-high-density-accent/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-high-density-accent font-black mb-1 relative z-10">
              TOTAL AMOUNT WITH GST
            </span>
            <div className="flex items-baseline gap-1 relative z-10">
              <span className="text-sm font-light opacity-40">$</span>
              <span className="text-4xl font-black font-mono tracking-tighter leading-none group-hover:scale-[1.02] transition-transform origin-left">
                {standardTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Section 3: Cash Incentive Discount (Rearranged) */}
          <div 
            id="cash-incentive-box"
            className="p-6 border-r border-high-density-fg flex flex-col justify-center bg-high-density-fg text-high-density-bg relative overflow-hidden group"
          >
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-2xl"></div>
            <div className="mb-2 relative z-10 space-y-0.5">
              <p className="text-[9px] font-mono uppercase opacity-40 tracking-widest">Quote amount if paying by cash:</p>
              <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-1">
                <div className="flex items-baseline gap-0.5">
                  <input 
                    type="number"
                    value={cashDiscountPercent}
                    onChange={(e) => setCashDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-10 text-xl font-mono font-black bg-transparent border-b border-transparent hover:border-high-density-accent focus:border-high-density-accent focus:ring-0 p-0 transition-all outline-none text-right text-high-density-accent"
                  />
                  <span className="text-sm font-bold text-white tracking-widest">%</span>
                </div>
                <div className="text-2xl font-mono font-black text-high-density-accent tracking-tighter">
                  ${cashNetTotal.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <Coins size={10} className="text-high-density-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Cash Incentive Discount</p>
            </div>
          </div>
          
          {/* Section 4: Export Button */}
          <div className="bg-high-density-fg p-6 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/[0.02] group-hover:bg-white/[0.05] transition-colors"></div>
            <button 
              onClick={exportScreenshot}
              disabled={isExporting}
              className={`
                w-full bg-white text-high-density-fg py-2.5 text-[10px] font-black uppercase tracking-[0.4em] 
                hover:bg-high-density-accent hover:text-white transition-all cursor-pointer 
                active:scale-95 shadow-lg flex items-center justify-center gap-3 relative z-10
                border-b-2 border-high-density-accent/20
                ${isExporting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isExporting ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Camera size={12} />
              )}
              {isExporting ? "..." : "EXPORT"}
            </button>
          </div>
        </footer>
      </div>


      <div className="mt-8 flex items-center justify-center gap-10 opacity-30 text-[10px] font-mono uppercase tracking-[0.4em] font-black">
        <div className="flex items-center gap-2">
            <Info size={12} />
            Service Terms Applied
        </div>
        <div className="flex items-center gap-2">
            <TrendingDown size={12} />
            Bulk Rate Discounts Available
        </div>
        <div className="flex items-center gap-2">
            <Coins size={12} />
            GST Compliant Quoting
        </div>
      </div>
    </div>
  );
}

function ToggleBox({ 
  id,
  active, 
  onToggle, 
  label,
  isLast = false
}: { 
  id: string,
  active: boolean, 
  onToggle: () => void, 
  label: string,
  isLast?: boolean
}) {
  return (
    <div 
      id={id}
      onClick={onToggle}
      className={`
        p-6 flex flex-col justify-between cursor-pointer transition-all border-high-density-fg group
        ${!isLast ? "border-r" : ""}
        ${active ? "bg-high-density-fg text-high-density-bg shadow-inner" : "bg-white hover:bg-high-density-fg/5"}
      `}
    >
      <label className={`text-[10px] font-mono uppercase tracking-[0.2em] font-black transition-opacity ${active ? "text-high-density-accent" : "opacity-40 group-hover:opacity-100"}`}>
        {label}
      </label>
      <div className="flex items-center justify-between mt-6">
        <span className="text-xl font-black uppercase font-mono tracking-tighter leading-none">{active ? "Active" : "None"}</span>
        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
          active 
            ? "bg-high-density-accent border-high-density-accent shadow-[0_0_15px_rgba(34,197,94,0.6)] scale-110" 
            : "bg-transparent border-current opacity-20 scale-100"
        }`} />
      </div>
    </div>
  );
}

