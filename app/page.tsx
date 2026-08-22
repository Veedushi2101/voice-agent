'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useVoiceAssistant } from '@/store/useVoiceAssistant';
import { 
  Mic, 
  Trash2, 
  Send, 
  ShoppingBag, 
  Globe, 
  Leaf, 
  Loader2, 
  Search, 
  Clock, 
  X, 
  Plus, 
  Minus, 
  Bookmark, 
  ShieldCheck, 
  Truck, 
  AlertCircle, 
  Sparkles,
  ArrowRightLeft,
  Bell,
  Tag,
  Flame
} from 'lucide-react';

export default function CompleteVoiceCart() {
  const { 
    items, 
    savedItems, 
    purchaseHistory, 
    activeSuggestions, 
    unreadNotificationCount,
    budgetLimit, 
    searchResults, 
    activeSearchQuery, 
    clearSearch, 
    clearSuggestions, 
    clearNotifications,
    checkAndTriggerDepletionAlerts,
    isListening, 
    transcript, 
    selectedLanguage, 
    setLanguage, 
    updateQuantityById, 
    removeItem, 
    saveForLater, 
    moveToCart, 
    checkoutCart, 
    swapItem,
    addItem 
  } = useShoppingStore();

  const { toggleListening, processTranscript, isProcessing, feedbackMessage } = useVoiceAssistant();
  const [manualInput, setManualInput] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
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
    new Set((items || []).map((i) => (i.category && i.category.trim() ? i.category : 'Pantry')))
  );

  const subtotal = (items || []).reduce(
    (acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)),
    0
  );
  const totalItemCount = (items || []).reduce(
    (acc, item) => acc + Number(item.quantity || 1),
    0
  );
  const freeShippingThreshold = 499.0;
  const shippingFee = 40.0;
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const isBudgetExceeded = budgetLimit !== null && subtotal > budgetLimit;

  const testPrompts = [
    { label: "1. Multi-Item Voice", prompt: "Add 2 kg potatoes and 3 packets of milk" },
    { label: "2. Out of Stock Alert", prompt: "What am I running low on?" },
    { label: "3. Live Sales & Deals", prompt: "Show today's deals and discounts" },
    { label: "4. Substitutes", prompt: "Add 1 kg of white sugar" },
    { label: "5. Voice Search & Filter", prompt: "Find green tea under ₹300" },
    { label: "6. Seasonal Recommendations", prompt: "What is in season right now?" }
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isProcessing) return;
    processTranscript(manualInput.trim());
    setManualInput('');
  };

  const handleCheckout = () => {
    checkoutCart();
    setOrderPlaced(true);
    setTimeout(() => setOrderPlaced(false), 5000);
  };

  return (
    <main className="min-h-screen w-full bg-[#F6F6F6] text-[#131A22] antialiased overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="bg-[#131921] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold text-lg tracking-tight">
            <ShoppingBag className="w-5 h-5 text-[#E08E9B]" />
            <span className="font-serif">Maison<span className="text-[#E08E9B]">Cart</span></span>
          </div>
          <span className="hidden sm:inline text-xs text-stone-400 border-l border-stone-700 pl-3">
            Voice-Activated Indian Grocery & Smart Pantry
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                clearNotifications();
              }}
              className="relative p-2 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Notifications & Deals"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Modal */}
            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-50 text-stone-900 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <Bell className="w-3.5 h-3.5 text-[#E08E9B]" />
                    <span>Smart Activity & Restock Notifications</span>
                  </div>
                  <button onClick={() => setShowNotificationDropdown(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {purchaseHistory.filter(h => ((Date.now() - h.lastBought) / 86400000) >= (h.depletionDays || 4)).map((item, idx) => (
                    <div key={idx} className="bg-rose-50/80 border border-rose-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-rose-950">⚠️ Running Low: {item.name}</p>
                        <p className="text-[10px] text-rose-700">Bought {Math.round((Date.now() - item.lastBought) / 86400000)} days ago • Estimated empty</p>
                      </div>
                      <button
                        onClick={() => {
                          addItem({ name: item.name, quantity: 1, unit: item.unit || 'unit', category: item.category, price: item.price });
                          setShowNotificationDropdown(false);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] px-2.5 py-1 rounded-md"
                      >
                        + Reorder
                      </button>
                    </div>
                  ))}

                  <div className="bg-amber-50/80 border border-amber-100 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-amber-950">🔥 Live Weekend Super Saver</p>
                      <p className="text-[10px] text-amber-800">Up to 40% OFF on pantry staples today</p>
                    </div>
                    <button
                      onClick={() => {
                        processTranscript("Show today's deals and discounts");
                        setShowNotificationDropdown(false);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] px-2.5 py-1 rounded-md"
                    >
                      View Deals
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
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
              <option value="es-ES">Español</option>
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
                        ? 'bg-[#E08E9B] text-white scale-105 ring-4 ring-[#E08E9B]/30 animate-pulse'
                        : isProcessing
                        ? 'bg-stone-300 text-white cursor-not-allowed'
                        : 'bg-[#131921] text-white hover:bg-stone-800'
                    }`}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {isListening ? "Listening... Speak naturally" : isProcessing ? "Groq AI is searching web & reasoning..." : "Tap mic to speak"}
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {feedbackMessage || transcript || "Say: 'Show today's deals' or 'What am I running low on?'"}
                    </p>
                  </div>
                </div>

                {budgetLimit && (
                  <div className="hidden sm:block text-right shrink-0 pl-3">
                    <span className="text-[11px] text-stone-400 uppercase font-semibold">Budget Guard</span>
                    <p className={`text-sm font-mono font-bold ${isBudgetExceeded ? 'text-rose-600' : 'text-stone-800'}`}>
                      ₹{subtotal.toFixed(2)} / ₹{budgetLimit.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Smart Prompts */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-stone-100">
                <span className="text-[10px] uppercase font-bold text-stone-400 mr-1">Smart Prompts:</span>
                {testPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    disabled={isProcessing}
                    onClick={() => {
                      useShoppingStore.getState().setTranscript(item.prompt);
                      processTranscript(item.prompt);
                    }}
                    className="text-[11px] bg-stone-50 hover:bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md border border-stone-200 transition-all font-medium active:scale-95 whitespace-nowrap"
                  >
                    ✨ {item.label}
                  </button>
                ))}
              </div>

              {/* Command Text Input Fallback */}
              <form onSubmit={handleManualSubmit} className="relative flex items-center pt-1">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Type any command: 'Show deals', 'What is running low?', 'Add white sugar'..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3.5 py-2 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <button type="submit" className="absolute right-2.5 text-stone-400 hover:text-stone-700">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Smart Alerts & Live Deals Banner */}
            {Array.isArray(activeSuggestions) && activeSuggestions.length > 0 && (
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-rose-900">
                    <Sparkles className="w-4 h-4 text-[#E08E9B]" />
                    <span className="text-xs font-bold uppercase tracking-wider">Live Discounts & Smart Recommendations</span>
                  </div>
                  <button onClick={clearSuggestions} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeSuggestions.map((s, idx) => {
                    const isDeal = s.type === 'sale_deal' || !!s.discountBadge;
                    const isRestock = s.type === 'restock_alert';

                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
                          isDeal 
                            ? 'bg-amber-50/90 border-amber-200' 
                            : isRestock 
                            ? 'bg-rose-50/90 border-rose-200' 
                            : 'bg-white border-rose-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <span className="text-2xl shrink-0">{s.item?.image || (isDeal ? '🔥' : '🛒')}</span>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-stone-900 truncate">{s.item?.name}</p>
                              {s.discountBadge && (
                                <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5" /> {s.discountBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-600 truncate">{s.reason}</p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="text-stone-900 font-bold">₹{Number(s.item?.price || 0).toFixed(2)}</span>
                              {s.item?.originalPrice && (
                                <span className="text-stone-400 line-through text-[10px]">
                                  ₹{Number(s.item?.originalPrice).toFixed(2)}
                                </span>
                              )}
                              <span className="text-stone-400 text-[10px]">/ {s.item?.unit || 'unit'}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            addItem({
                              name: s.item?.name || 'Suggested Item',
                              quantity: 1,
                              unit: s.item?.unit || 'unit',
                              category: s.item?.category && s.item.category.trim() ? s.item.category : 'Pantry',
                              price: Number(s.item?.price) || 80,
                              image: s.item?.image || '🛒',
                            })
                          }
                          className={`text-xs text-white px-3 py-1.5 rounded-lg font-medium transition-all shadow-xs shrink-0 active:scale-95 ${
                            isDeal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E08E9B] hover:bg-[#D47786]'
                          }`}
                        >
                          + {isRestock ? 'Reorder' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voice Search Results Box */}
            {Array.isArray(searchResults) && searchResults.length > 0 && (
              <div className="bg-[#F0F4F2] p-4 rounded-2xl border border-[#8FA89B]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-stone-800">
                    <Search className="w-4 h-4 text-[#8FA89B]" />
                    <span className="text-xs font-bold uppercase">Search Results: "{activeSearchQuery}"</span>
                  </div>
                  <button onClick={clearSearch} className="text-stone-400 hover:text-stone-700"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchResults.map((product, idx) => (
                    <div key={product.id || product.name || idx} className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="text-2xl shrink-0">{product.image || '🛒'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 truncate">{product.name}</p>
                          <p className="text-[11px] text-stone-500 font-mono">
                            ₹{Number(product.price || 0).toFixed(2)} / {product.unit || 'pack'} {product.brand ? `• ${product.brand}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          addItem({
                            name: product.name,
                            quantity: 1,
                            unit: product.unit || 'pack',
                            category: product.category && product.category.trim() ? product.category : 'Pantry',
                            price: Number(product.price) || 120,
                            image: product.image || '🛒',
                            brand: product.brand || undefined,
                          })
                        }
                        className="text-xs bg-[#8FA89B] hover:bg-[#7D9689] active:scale-95 text-white px-3.5 py-1.5 rounded-lg font-medium transition-all shadow-xs shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shopping Cart List */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold font-serif text-stone-900">Shopping Cart</h2>
                  <p className="text-xs text-stone-500">{totalItemCount} items organized by category</p>
                </div>
                <span className="text-xs text-stone-400 font-medium">Price (INR)</span>
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Sparkles className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-stone-700 font-medium text-sm">Your cart is empty</p>
                  <p className="text-xs text-stone-400">Speak commands like "Add 1 kg white sugar" or "Show today's deals".</p>
                </div>
              ) : (
                categories.map((categoryName) => {
                  const categoryItems = items.filter(
                    (i) => (i.category && i.category.trim() ? i.category : 'Pantry') === categoryName
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
                        {categoryItems.map((item) => (
                          <div key={item.id} className="p-3.5 bg-white space-y-2">
                            <div className="flex items-start justify-between space-x-4">
                              <div className="flex items-start space-x-3.5 min-w-0">
                                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-2xl border border-stone-100 shrink-0">
                                  {item.image || '🛒'}
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-semibold text-stone-900 leading-snug">{item.name}</h3>
                                    <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap">
                                      {item.quantity} {item.unit || 'unit'}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-emerald-700 font-medium">
                                    In Stock {item.brand ? `• Brand: ${item.brand}` : ''}
                                  </p>

                                  {/* Stepper + Save for Later + Delete */}
                                  <div className="flex items-center space-x-3 pt-1 flex-wrap gap-y-1">
                                    <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                                      <button 
                                        onClick={() => updateQuantityById(item.id, -1)} 
                                        className="px-2 py-1 text-stone-500 hover:text-stone-900 transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="px-2 text-xs font-mono font-semibold text-stone-800 whitespace-nowrap">
                                        {item.quantity} {item.unit || 'unit'}
                                      </span>
                                      <button 
                                        onClick={() => updateQuantityById(item.id, 1)} 
                                        className="px-2 py-1 text-stone-500 hover:text-stone-900 transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <span className="text-stone-200">|</span>
                                    <button 
                                      onClick={() => saveForLater(item.id)} 
                                      className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors whitespace-nowrap"
                                    >
                                      <Bookmark className="w-3 h-3" /> Save for later
                                    </button>

                                    <span className="text-stone-200">|</span>
                                    <button 
                                      onClick={() => removeItem(item.id)} 
                                      className="text-xs text-rose-500 hover:text-rose-700 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold font-mono text-stone-900">
                                  ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                                </p>
                                <p className="text-[10px] text-stone-400 font-mono">
                                  ₹{Number(item.price || 0).toFixed(2)} / {item.unit || 'unit'}
                                </p>
                              </div>
                            </div>

                            {/* Interactive Substitute Swap Banner */}
                            {item.substituteSuggestion && (
                              <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 mt-2 text-xs text-amber-950">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate">
                                      Healthy Alternative: {item.substituteSuggestion.name} (₹{item.substituteSuggestion.price} / {item.substituteSuggestion.unit || 'unit'})
                                    </p>
                                    <p className="text-[11px] text-amber-800 truncate">
                                      {item.substituteSuggestion.reason || 'Cleaner, healthier dietary swap'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => swapItem(item.id, item.substituteSuggestion!)}
                                  className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-medium px-3 py-1.5 rounded-lg text-[11px] shrink-0 transition-all flex items-center gap-1 shadow-xs"
                                >
                                  <ArrowRightLeft className="w-3 h-3" /> Swap Now
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Saved for Later */}
            {Array.isArray(savedItems) && savedItems.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-md font-bold text-stone-900">Saved for Later ({savedItems.length} items)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedItems.map((s) => (
                    <div key={s.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between bg-stone-50/50">
                      <div>
                        <p className="text-xs font-semibold text-stone-800">{s.name}</p>
                        <p className="text-xs font-mono text-stone-500">₹{Number(s.price || 0).toFixed(2)} / {s.unit || 'unit'}</p>
                      </div>
                      <button 
                        onClick={() => moveToCart(s.id)} 
                        className="text-xs bg-stone-900 text-white px-2.5 py-1 rounded-md hover:bg-stone-800 transition-colors shrink-0 ml-2"
                      >
                        Move to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Checkout & Restock History (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Order Summary Checkout Card */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="space-y-1.5 border-b border-stone-100 pb-3">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-[#8FA89B]" /> Free Shipping</span>
                  <span>{subtotal >= freeShippingThreshold ? 'Unlocked! 🎉' : `₹${(freeShippingThreshold - subtotal).toFixed(2)} away`}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#8FA89B] h-full transition-all duration-500" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>

              {isBudgetExceeded && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Budget Exceeded</p>
                    <p>Cart is ₹{(subtotal - (budgetLimit || 0)).toFixed(2)} over limit.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Items Subtotal ({totalItemCount}):</span>
                  <span className="font-mono text-stone-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="font-mono text-stone-900">{subtotal >= freeShippingThreshold ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-stone-900 border-t border-stone-100 pt-2">
                  <span>Order Total:</span>
                  <span className="font-mono text-[#131921]">₹{(subtotal + (subtotal >= freeShippingThreshold ? 0 : shippingFee)).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="w-full bg-[#E08E9B] hover:bg-[#D47786] disabled:opacity-40 text-white font-semibold text-sm py-3 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Proceed to Checkout</span>
              </button>
            </div>

            {/* Past Purchases / Restock Drawer */}
            {Array.isArray(purchaseHistory) && purchaseHistory.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-1.5 text-stone-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Restock Suggestions</h3>
                </div>
                <p className="text-[11px] text-stone-400">Based on past shopping cycles</p>
                <div className="space-y-2">
                  {purchaseHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-stone-800 truncate">{h.name}</p>
                        <p className="text-[10px] text-stone-400">Bought {Math.max(1, Math.round((Date.now() - (h.lastBought || Date.now())) / 86400000))} days ago</p>
                      </div>
                      <button
                        onClick={() => addItem({ name: h.name, quantity: 1, unit: h.unit || 'unit', category: h.category, price: h.price })}
                        className="text-[11px] bg-stone-900 hover:bg-stone-800 active:scale-95 text-white px-2.5 py-1 rounded-md font-medium transition-all shrink-0"
                      >
                        + ₹{Number(h.price || 0).toFixed(2)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </main>
  );
}