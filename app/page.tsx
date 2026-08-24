'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useShoppingStore, resolveSubstitute, INITIAL_DEALS } from '@/store/useShoppingStore';
import { useVoiceAssistant } from '@/store/useVoiceAssistant';
import { 
  Mic, 
  Send, 
  ShoppingBag, 
  Globe, 
  Leaf, 
  Loader2, 
  Clock, 
  X, 
  Bookmark, 
  ShieldCheck, 
  Truck, 
  AlertCircle, 
  Sparkles, 
  ArrowRightLeft, 
  Bell, 
  HelpCircle,
  Flame,
  Scale,
  History,
  Store
} from 'lucide-react';

const DAILY_BASIC_STAPLES = [
  { name: 'Hybrid Fresh Tomatoes', basePrice: 40, baseUnit: 'kg', unit: '500 g', quantity: 500, category: 'Produce', image: '🍅' },
  { name: 'Desi Red Onions (Pyaaz)', basePrice: 50, baseUnit: 'kg', unit: '1 kg', quantity: 1, category: 'Produce', image: '🧅' },
  { name: 'Fresh Potatoes (Aloo)', basePrice: 30, baseUnit: 'kg', unit: '1 kg', quantity: 1, category: 'Produce', image: '🥔' },
  { name: 'Fresh Coriander (Dhaniya)', basePrice: 100, baseUnit: 'kg', unit: '100 g', quantity: 100, category: 'Produce', image: '🌿' },
  { name: 'Robusta Bananas', basePrice: 60, baseUnit: 'dozen', unit: '1 dozen', quantity: 1, category: 'Produce', image: '🍌' },
  { name: 'Amul Taaza Toned Milk', basePrice: 66, baseUnit: 'litre', unit: '500 ml', quantity: 500, category: 'Dairy & Plant', image: '🥛' },
  { name: 'Whole Wheat Brown Bread', basePrice: 45, baseUnit: 'pack', unit: '400 g', quantity: 1, category: 'Bakery', image: '🍞' },
  { name: 'Aashirvaad Sharbati Atta', basePrice: 45, baseUnit: 'kg', unit: '1 kg', quantity: 1, category: 'Pantry', image: '🌾' },
];

export default function CompleteVoiceCart() {
  const { 
    items, 
    savedItems, 
    purchaseHistory, 
    activeSuggestions, 
    unreadNotificationCount, 
    budgetLimit, 
    clearSuggestions, 
    checkAndTriggerDepletionAlerts, 
    isListening, 
    transcript, 
    selectedLanguage, 
    setLanguage, 
    updateWeightPortion,
    removeItem, 
    saveForLater, 
    moveToCart, 
    checkoutCart, 
    swapItem, 
    addItem 
  } = useShoppingStore();

  const { toggleListening, processTranscript, isProcessing, feedbackMessage } = useVoiceAssistant();
  const [manualInput, setManualInput] = useState('');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAndTriggerDepletionAlerts();
  }, [checkAndTriggerDepletionAlerts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotificationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = Array.from(
    new Set((items || []).map((i) => (i?.category && i.category.trim() ? i.category : 'Produce')))
  );

  const subtotal = (items || []).reduce(
    (acc, item) => acc + (Number(item?.price) || 0),
    0
  );
  const totalItemCount = items.length;
  const freeShippingThreshold = 499.0;
  const shippingFee = 40.0;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const isBudgetExceeded = budgetLimit !== null && subtotal > budgetLimit;

  // Always display deals (from active state or default initial catalog)
  const effectiveSuggestions = (activeSuggestions && activeSuggestions.length > 0) ? activeSuggestions : INITIAL_DEALS;
  const dealSuggestions = effectiveSuggestions.filter(
    (s) => s?.type === 'sale_deal' || !!(s as any)?.discountBadge
  );
  const restockSuggestions = effectiveSuggestions.filter(
    (s) => s?.type === 'restock_alert'
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isProcessing) return;
    processTranscript(manualInput.trim());
    setManualInput('');
  };

  const handleCheckout = () => {
    checkoutCart();
    alert('Order placed successfully! Checked out items updated to right now.');
  };

  function formatRelativeDate(lastBoughtTimestamp: number) {
    if (!lastBoughtTimestamp) return 'Never bought';
    const days = Math.round((Date.now() - lastBoughtTimestamp) / 86400000);
    if (days <= 0) return 'Bought today (Just now)';
    if (days === 1) return 'Bought 1 day ago';
    return `Bought ${days} days ago`;
  }

  return (
    <main className="min-h-screen w-full bg-[#F6F6F6] text-[#131A22] antialiased overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="bg-[#131921] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold text-lg tracking-tight">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            <span className="font-serif">Maison<span className="text-emerald-500">Cart</span></span>
          </div>
          <span className="hidden sm:inline text-xs text-stone-400 border-l border-stone-700 pl-3">
            Indian Grocery, Weight-Based Pricing & Smart Pantry
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white text-xs font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Voice & Weight Guide</span>
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="relative p-2 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Restock Alerts & Deals"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Fully Restored Notification Drawer Body */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-50 text-stone-900 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Smart Restock & Daily Deal Alerts</span>
                  </div>
                  <button onClick={() => setShowNotificationDropdown(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {/* Daily Flash Discounts Banner */}
                  <div className="bg-amber-50/90 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-amber-950 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-600" /> Live Deals of the Day
                      </p>
                      <p className="text-[10px] text-amber-800">Up to 40% OFF on daily pantry & dairy staples</p>
                    </div>
                    <button
                      onClick={() => {
                        processTranscript("Show today's deals and discounts");
                        setShowNotificationDropdown(false);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shrink-0"
                    >
                      View Deals
                    </button>
                  </div>

                  {/* Restock Alerts */}
                  {purchaseHistory.filter(h => ((Date.now() - h.lastBought) / 86400000) >= (h.depletionDays || 4)).map((item, idx) => (
                    <div key={idx} className="bg-rose-50/90 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-rose-950">⚠️ Running Low: {item.name}</p>
                        <p className="text-[10px] text-rose-700">
                          Bought {Math.round((Date.now() - item.lastBought) / 86400000)} days ago • {item.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          addItem({ name: item.name, quantity: 1, unit: item.unit || '1 kg', category: item.category, price: item.price });
                          setShowNotificationDropdown(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-md shrink-0"
                      >
                        + Reorder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-stone-800 rounded-lg px-2.5 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-stone-200 font-medium"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-5 min-w-0">
            
            {/* AI Voice Assistant Capsule */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-sm shrink-0 ${
                      isListening
                        ? 'bg-emerald-600 text-white scale-105 ring-4 ring-emerald-500/30 animate-pulse'
                        : isProcessing
                        ? 'bg-stone-300 text-white cursor-not-allowed'
                        : 'bg-[#131921] text-white hover:bg-stone-800'
                    }`}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {isListening ? "Listening... Speak naturally (e.g. 'Add 250g tomatoes')" : isProcessing ? "Groq AI is calculating..." : "Tap mic to speak"}
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {feedbackMessage || transcript || "Try: 'Show today's deals', 'Add 250g tomatoes', or 'Suggest substitute for butter'"}
                    </p>
                  </div>
                </div>

                {budgetLimit && (
                  <div className="hidden sm:block text-right shrink-0 pl-3">
                    <span className="text-[11px] text-stone-400 uppercase font-semibold">Budget Guard</span>
                    <p className={`text-sm font-mono font-bold ${isBudgetExceeded ? 'text-rose-600' : 'text-stone-800'}`}>
                      ₹{subtotal.toFixed(0)} / ₹{budgetLimit.toFixed(0)}
                    </p>
                  </div>
                )}
              </div>

              {/* Command Text Input */}
              <form onSubmit={handleManualSubmit} className="relative flex items-center pt-1">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Type: 'Show today's deals', 'Add 250g tomatoes', 'What is running low?', 'Suggest substitute for butter'..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <button type="submit" className="absolute right-2.5 text-stone-400 hover:text-stone-700">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Daily Verified Deals Deck */}
            {dealSuggestions.length > 0 && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>🔥 Live Deals of the Day (Verified Daily Discounts)</span>
                  </div>
                  <button onClick={clearSuggestions} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {dealSuggestions.map((s, idx) => {
                    const itemPrice = Number(s.price || 50);
                    const itemOriginal = Number(s.originalPrice || itemPrice * 1.3);
                    const itemDiscount = s.discountBadge || '30% OFF';

                    return (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between space-y-2">
                        <div className="flex items-start space-x-2 min-w-0">
                          <span className="text-2xl shrink-0">{s.image || '🔥'}</span>
                          <div className="min-w-0 space-y-0.5">
                            <span className="bg-[#2563EB] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              {itemDiscount}
                            </span>
                            <p className="text-xs font-semibold text-stone-900 truncate">{s.name}</p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="text-stone-900 font-bold">₹{itemPrice.toFixed(0)}</span>
                              <span className="text-stone-400 line-through text-[10px]">
                                MRP ₹{itemOriginal.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            addItem({
                              name: s.name,
                              quantity: 1,
                              unit: s.unit || '1 unit',
                              category: s.category || 'Pantry',
                              price: itemPrice,
                              image: s.image || '🔥',
                            })
                          }
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1.5 rounded-lg transition-all shadow-xs"
                        >
                          + Add Deal
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Replenishment & Out-of-Stock Alerts */}
            {restockSuggestions.length > 0 && (
              <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-rose-950 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Replenishment & Out-of-Stock Alerts (3+ Day Cycle)</span>
                  </div>
                  <button onClick={clearSuggestions} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {restockSuggestions.map((s, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="text-2xl shrink-0">{s.image || '🛒'}</span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[11px] font-medium text-stone-500">{s.unit || '1 kg'}</p>
                          <p className="text-xs font-semibold text-stone-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-rose-700 truncate font-medium">{s.reason}</p>
                          <p className="text-[11px] font-mono font-bold text-stone-900">₹{s.price}</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          addItem({
                            name: s.name,
                            quantity: 1,
                            unit: s.unit || '1 kg',
                            category: s.category || 'Produce',
                            price: s.price,
                            image: s.image || '🛒',
                          })
                        }
                        className="text-xs bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-xs shrink-0"
                      >
                        + Reorder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick-Add Everyday Essentials & Produce Catalog */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-stone-900">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Quick-Add Fresh Produce & Daily Staples</h3>
                </div>
                <span className="text-[11px] text-stone-400 font-mono">Standard Indian Market Rates</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DAILY_BASIC_STAPLES.map((staple, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 flex flex-col justify-between space-y-2 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{staple.image}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-900 truncate">{staple.name}</p>
                        <p className="text-[10px] text-stone-500 font-mono">₹{staple.basePrice}/{staple.baseUnit}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addItem(staple)}
                      className="w-full text-[11px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1 rounded-md transition-all shadow-xs"
                    >
                      + Add ({staple.unit})
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Shopping Basket List with Weight Chips & Swaps */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold font-serif text-stone-900">Your Basket</h2>
                  <p className="text-xs text-stone-500">{totalItemCount} items • Proportional weight pricing</p>
                </div>
                <span className="text-xs text-stone-400 font-medium">Calculated Price</span>
              </div>

              {items.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Scale className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-stone-700 font-medium text-sm">Your basket is empty</p>
                  <p className="text-xs text-stone-400">Speak weights: "Add 250g tomatoes", "Add 500g onions", or click the Quick-Add items above.</p>
                </div>
              ) : (
                categories.map((categoryName) => {
                  const categoryItems = items.filter(
                    (i) => (i?.category && i.category.trim() ? i.category : 'Produce') === categoryName
                  );

                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={categoryName} className="space-y-3">
                      <div className="flex items-center space-x-2 pt-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{categoryName}</span>
                        <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-mono font-semibold">
                          {categoryItems.length}
                        </span>
                      </div>

                      <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden bg-stone-50/40">
                        {categoryItems.map((item) => {
                          const isWeightBased = item.baseUnit === 'kg' || item.unit === 'kg' || item.unit === 'g';
                          const isDozenBased = item.baseUnit === 'dozen' || item.unit === 'dozen';
                          const sub = item.substituteSuggestion || resolveSubstitute(item.name);

                          return (
                            <div key={item.id} className="p-3.5 bg-white space-y-2">
                              <div className="flex items-start justify-between space-x-4">
                                <div className="flex items-start space-x-3.5 min-w-0">
                                  <div className="w-14 h-14 bg-stone-50 rounded-xl flex items-center justify-center text-3xl border border-stone-100 shrink-0">
                                    {item.image || '🥬'}
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-sm font-semibold text-stone-900 leading-snug">
                                        {item.name || 'Grocery Item'}
                                      </h3>
                                      <span className="text-[11px] text-stone-500 font-mono">
                                        (Rate: ₹{item.basePrice}/{item.baseUnit})
                                      </span>
                                      {item.substitutionNote && (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <Leaf className="w-3 h-3 text-emerald-600" /> Swapped Choice
                                        </span>
                                      )}
                                    </div>

                                    {/* Fast Weight Portion Chips */}
                                    {isWeightBased && (
                                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                        {[
                                          { label: '100g', qty: 100, unit: 'g' },
                                          { label: '250g', qty: 250, unit: 'g' },
                                          { label: '500g', qty: 500, unit: 'g' },
                                          { label: '1kg', qty: 1, unit: 'kg' },
                                          { label: '2kg', qty: 2, unit: 'kg' },
                                        ].map((chip) => {
                                          const isSelected = item.quantity === chip.qty && item.unit === chip.unit;
                                          return (
                                            <button
                                              key={chip.label}
                                              onClick={() => updateWeightPortion(item.id, chip.qty, chip.unit)}
                                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                                isSelected 
                                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                              }`}
                                            >
                                              {chip.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Dozen Portions */}
                                    {isDozenBased && (
                                      <div className="flex items-center gap-1.5 pt-1">
                                        {[
                                          { label: 'Half Dozen (6 pcs)', qty: 6, unit: 'piece' },
                                          { label: '1 Dozen (12 pcs)', qty: 1, unit: 'dozen' },
                                          { label: '2 Dozen (24 pcs)', qty: 2, unit: 'dozen' },
                                        ].map((chip) => {
                                          const isSelected = item.quantity === chip.qty && item.unit === chip.unit;
                                          return (
                                            <button
                                              key={chip.label}
                                              onClick={() => updateWeightPortion(item.id, chip.qty, chip.unit)}
                                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                                isSelected 
                                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                                              }`}
                                            >
                                              {chip.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    <div className="flex items-center space-x-3 pt-1 text-xs text-stone-500">
                                      <span className="font-mono text-stone-800 font-bold">
                                        Selected: {item.quantity} {item.unit}
                                      </span>
                                      <span className="text-stone-200">|</span>
                                      <button onClick={() => saveForLater(item.id)} className="hover:text-stone-900 flex items-center gap-1">
                                        <Bookmark className="w-3 h-3" /> Save
                                      </button>
                                      <span className="text-stone-200">|</span>
                                      <button onClick={() => removeItem(item.id)} className="text-rose-500 hover:text-rose-700">
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-base font-bold font-mono text-stone-900">
                                    ₹{Math.round(item.price)}
                                  </p>
                                  <p className="text-[10px] text-stone-400 font-mono">
                                    {item.quantity} {item.unit} @ ₹{item.basePrice}/{item.baseUnit}
                                  </p>
                                </div>
                              </div>

                              {/* Guaranteed Swap Banner */}
                              {sub && sub.name && !item.substitutionNote && (
                                <div className="flex items-center justify-between bg-amber-50/95 border border-amber-200 rounded-xl p-3 mt-2 text-xs text-amber-950">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <Leaf className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-[12px] truncate text-stone-900">
                                        Healthy Alternative: {sub.name} (₹{sub.price} / {sub.unit})
                                      </p>
                                      <p className="text-[11px] text-amber-800 truncate">
                                        {sub.reason}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => swapItem(item.id, sub)}
                                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-lg text-[11px] shrink-0 transition-all flex items-center gap-1 shadow-xs"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" /> Swap
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Saved for Later Section */}
            {Array.isArray(savedItems) && savedItems.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-md font-bold text-stone-900">Saved for Later ({savedItems.length} items)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedItems.map((s) => (
                    <div key={s.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between bg-stone-50/50">
                      <div>
                        <p className="text-xs font-semibold text-stone-800">{s.name}</p>
                        <p className="text-xs font-mono text-stone-500">₹{Math.round(s.price)} • {s.quantity} {s.unit}</p>
                      </div>
                      <button 
                        onClick={() => moveToCart(s.id)} 
                        className="text-xs bg-stone-900 text-white font-bold px-2.5 py-1 rounded-md hover:bg-stone-800 transition-colors shrink-0 ml-2"
                      >
                        Move to Basket
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Checkout & Previously Bought Items (Sorted Descending) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Order Summary Checkout Card */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="space-y-1.5 border-b border-stone-100 pb-3">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-emerald-600" /> Free Shipping</span>
                  <span>{subtotal >= freeShippingThreshold ? 'Unlocked! 🎉' : `₹${Math.round(freeShippingThreshold - subtotal)} away`}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>

              {isBudgetExceeded && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Budget Exceeded</p>
                    <p>Cart is ₹{Math.round(subtotal - (budgetLimit || 0))} over limit.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Basket Subtotal ({totalItemCount} items):</span>
                  <span className="font-mono text-stone-900">₹{Math.round(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="font-mono text-stone-900">{subtotal >= freeShippingThreshold ? 'FREE' : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-stone-900 border-t border-stone-100 pt-2">
                  <span>Order Total:</span>
                  <span className="font-mono text-[#131921]">₹{Math.round(subtotal + (subtotal >= freeShippingThreshold ? 0 : shippingFee))}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Proceed to Checkout</span>
              </button>
            </div>

            {/* Previously Bought Items / One-Tap Reorder List */}
            {Array.isArray(purchaseHistory) && purchaseHistory.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-1.5 text-stone-900">
                  <History className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Previously Bought Items</h3>
                </div>
                <p className="text-[11px] text-stone-400">One-tap reorder from past shopping history</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {[...purchaseHistory]
                    .sort((a, b) => (b.lastBought || 0) - (a.lastBought || 0))
                    .map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-stone-800 truncate">{h.name}</p>
                          <p className="text-[10px] text-stone-400">
                            {formatRelativeDate(h.lastBought)} • {h.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => addItem({ name: h.name, quantity: 1, unit: h.unit || '1 kg', category: h.category, price: h.price })}
                          className="text-[11px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-2.5 py-1.5 rounded-lg transition-all shrink-0 shadow-xs"
                        >
                          + ₹{Number(h.price || 0).toFixed(0)}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

{/* Comprehensive Voice Command & Features Guide Modal */}
{showHelpModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl border border-stone-200">
      
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">
              Voice Commands & Shopping Guide
            </h3>
            <p className="text-xs text-stone-500">
              Speak naturally in English or हिन्दी — all commands below are fully supported
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowHelpModal(false)}
          className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Guide Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        
        {/* 1. Weight-Based Produce Pricing */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>⚖️</span> <span>Weight-Based Pricing (₹/kg & Dozens)</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Prices calculate automatically based on standard Indian market rates per kg:
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add 250g tomatoes" <span className="text-emerald-700 font-bold">(₹10 @ ₹40/kg)</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add 500g onions" <span className="text-emerald-700 font-bold">(₹25 @ ₹50/kg)</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add 100g coriander" <span className="text-emerald-700 font-bold">(₹10 @ ₹100/kg)</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add 1 dozen bananas" <span className="text-emerald-700 font-bold">(₹60/dozen)</span>
            </li>
          </ul>
        </div>

        {/* 2. Recipe Bundle Decomposer */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>🍲</span> <span>Recipe Ingredients Bundles</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Ask for dish ingredients and the AI unpacks all essential groceries into your basket:
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add ingredients for Pav Bhaji" <br />
              <span className="text-[10px] text-stone-500 font-sans">↳ Adds Aloo, Tamatar, Pav Buns, Butter, Pav Bhaji Masala</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add ingredients for Chai" <br />
              <span className="text-[10px] text-stone-500 font-sans">↳ Adds Tea leaves, Milk, Sugar, Adrak, Elaichi</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Add ingredients for Dal Tadka"
            </li>
          </ul>
        </div>

        {/* 3. Daily Flash Deals & Discounts */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>🔥</span> <span>Live Deals of the Day</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Check verified daily discounts on kitchen & dairy staples:
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Show today's deals and discounts"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Any special discount on paneer or tea?"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Show me offers"
            </li>
          </ul>
        </div>

        {/* 4. Healthy Substitutions & In-Cart Swaps */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>🌿</span> <span>Healthy Product Swaps</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Get cleaner dietary alternatives with one-click in-cart swaps:
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Suggest substitute for butter" <span className="text-amber-800 font-sans">↳ Olive Oil</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Healthy alternative for white sugar" <span className="text-amber-800 font-sans">↳ Jaggery</span>
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Substitute for dairy milk" <span className="text-amber-800 font-sans">↳ Almond Milk</span>
            </li>
          </ul>
        </div>

        {/* 5. Restock & Out-of-Stock Alerts */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>⏰</span> <span>Smart Restock & Depletion Alerts</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Monitors perishability lifecycles (3 days for Milk/Dhaniya, 5 days for Tomatoes, 30 days for Atta/Rice):
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "What am I running low on?"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "What is out of stock in my kitchen?"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Show restock items"
            </li>
          </ul>
        </div>

        {/* 6. Quantity Adjustments & Basket Management */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5">
          <p className="font-bold text-stone-900 flex items-center gap-2 text-sm">
            <span>🛒</span> <span>Modify Quantities & Budget</span>
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Update portions, remove items, or set spending thresholds:
          </p>
          <ul className="space-y-1.5 text-stone-700 font-mono text-[11px]">
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Change tomatoes to 1 kg"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Remove milk from my basket"
            </li>
            <li className="bg-white p-1.5 rounded-lg border border-stone-200">
              • "Set budget limit to 1500 rupees"
            </li>
          </ul>
        </div>

      </div>

      {/* Footer Info & Close Action */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-700">
        <div className="space-y-0.5">
          <p className="font-semibold text-emerald-950">
            💡 Quick Tip: Tap weight chips directly in your basket
          </p>
          <p className="text-[11px] text-emerald-800">
            You can also click the <strong>100g, 250g, 500g, 1kg</strong> chips on any item to instantly recalculate prices.
          </p>
        </div>
        <button
          onClick={() => setShowHelpModal(false)}
          className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-5 py-2 rounded-xl transition-colors shrink-0 shadow-sm"
        >
          Got it
        </button>
      </div>

    </div>
  </div>
)}
    </main>
  );
}