import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubstituteInfo {
  name: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  unit?: string;
  category?: string;
  image?: string;
  reason?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  basePrice: number;
  baseUnit: string;
  price: number;
  image?: string;
  brand?: string;
  substitutionNote?: string;
  substituteSuggestion?: SubstituteInfo;
  isSavedForLater?: boolean;
}

export interface SmartSuggestion {
  name: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  unit: string;
  baseUnit?: string;
  category: string;
  image: string;
  reason: string;
  type?: 'restock_alert' | 'sale_deal' | 'seasonal' | 'substitute';
}

export interface SearchProduct {
  id?: string;
  name: string;
  brand?: string;
  price: number;
  unit?: string;
  category?: string;
  image?: string;
}

export interface PurchaseHistoryItem {
  name: string;
  category: string;
  price: number;
  lastBought: number;
  count: number;
  unit?: string;
  depletionDays: number;
}

export const HEALTHY_SUBSTITUTES_REGISTRY: Record<
  string,
  { name: string; price: number; unit: string; category: string; image: string; reason: string }
> = {
  sugar: { name: 'Organic Jaggery Powder', price: 65, unit: '1 kg', category: 'Pantry', image: '🍯', reason: 'Unrefined, mineral-rich natural sweetener' },
  milk: { name: 'Unsweetened Almond Milk', price: 140, unit: '1 litre', category: 'Dairy & Plant', image: '🥛', reason: 'Lactose-free, gut-friendly plant milk' },
  butter: { name: 'Cold-Pressed Olive Oil', price: 290, unit: '500 ml', category: 'Pantry', image: '🫒', reason: 'Heart-healthy monounsaturated fats' },
  bread: { name: 'Artisan Sourdough Loaf', price: 85, unit: '400 g', category: 'Bakery', image: '🍞', reason: 'Naturally fermented and gut-friendly' },
  atta: { name: 'Khapli Ancient Wheat Atta', price: 80, unit: '1 kg', category: 'Pantry', image: '🌾', reason: 'Ancient emmer wheat with easily digestible gluten' },
  aata: { name: 'Khapli Ancient Wheat Atta', price: 80, unit: '1 kg', category: 'Pantry', image: '🌾', reason: 'Ancient emmer wheat with easily digestible gluten' },
  flour: { name: 'Khapli Ancient Wheat Atta', price: 80, unit: '1 kg', category: 'Pantry', image: '🌾', reason: 'Ancient emmer wheat with easily digestible gluten' },
  rice: { name: 'Organic Brown Rice', price: 110, unit: '1 kg', category: 'Pantry', image: '🌾', reason: 'High-fiber complex carbohydrate' },
  oil: { name: 'Cold-Pressed Mustard Oil', price: 180, unit: '1 litre', category: 'Pantry', image: '🥥', reason: 'Unrefined, nutrient-dense cooking oil' },
  maida: { name: 'Multigrain Atta', price: 75, unit: '1 kg', category: 'Pantry', image: '🌾', reason: 'Zero refined flour, rich in dietary fiber' }
};

export const INITIAL_DEALS: SmartSuggestion[] = [
  {
    name: 'Catch Jeera / Cumin Seeds (100g)',
    price: 52,
    originalPrice: 75,
    discountBadge: '30% OFF',
    unit: '100 g',
    category: 'Pantry',
    image: '🌾',
    reason: "Today's Super Saver Flash Deal on daily kitchen spices",
    type: 'sale_deal'
  },
  {
    name: 'Milky Mist Fresh Paneer (200g)',
    price: 98,
    originalPrice: 165,
    discountBadge: '40% OFF',
    unit: '200 g',
    category: 'Dairy & Plant',
    image: '🧀',
    reason: "Today's Verified Discount on fresh high-protein dairy",
    type: 'sale_deal'
  },
  {
    name: 'Tata Tea Gold (500g)',
    price: 210,
    originalPrice: 300,
    discountBadge: '30% OFF',
    unit: '500 g',
    category: 'Pantry',
    image: '🍵',
    reason: "Today's Special Saver on premium tea blend",
    type: 'sale_deal'
  }
];

export function resolveSubstitute(name: string): SubstituteInfo | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  for (const [key, sub] of Object.entries(HEALTHY_SUBSTITUTES_REGISTRY)) {
    if (lower.includes(key)) return sub;
  }
  return undefined;
}

export function calculateProportionalPrice(quantity: number, unit: string, basePrice: number, baseUnit: string = 'kg'): number {
  const cleanUnit = (unit || '').toLowerCase().trim();
  const cleanBase = (baseUnit || '').toLowerCase().trim();

  if ((cleanBase === 'kg' || cleanBase === '1 kg') && (cleanUnit === 'g' || cleanUnit === 'gram' || cleanUnit === 'grams')) {
    return (quantity / 1000) * basePrice;
  }
  if ((cleanBase === 'kg' || cleanBase === '1 kg') && cleanUnit.endsWith('g') && !cleanUnit.includes('k')) {
    const numGrams = parseFloat(cleanUnit);
    return ((numGrams * quantity) / 1000) * basePrice;
  }
  if (cleanBase === 'kg' && cleanUnit === 'kg') {
    return quantity * basePrice;
  }
  if (cleanBase === 'dozen' && (cleanUnit === 'piece' || cleanUnit === 'pcs')) {
    return (quantity / 12) * basePrice;
  }
  if (cleanBase === 'dozen' && cleanUnit === 'half dozen') {
    return quantity * 0.5 * basePrice;
  }
  if (cleanBase === 'dozen' && cleanUnit === 'dozen') {
    return quantity * basePrice;
  }
  if ((cleanBase === 'litre' || cleanBase === '1 litre') && (cleanUnit === 'ml' || cleanUnit === 'millilitre')) {
    return (quantity / 1000) * basePrice;
  }

  return quantity * basePrice;
}

interface StoreState {
  items: ShoppingItem[];
  savedItems: ShoppingItem[];
  purchaseHistory: PurchaseHistoryItem[];
  activeSuggestions: SmartSuggestion[];
  unreadNotificationCount: number;
  budgetLimit: number | null;
  searchResults: SearchProduct[];
  activeSearchQuery: string | null;
  isListening: boolean;
  selectedLanguage: string;
  transcript: string;
  
  addItem: (item: Partial<ShoppingItem> & { name?: string; basePrice?: number; baseUnit?: string }) => void;
  removeItem: (idOrName?: string) => void;
  swapItem: (oldItemId: string, substitute: SubstituteInfo) => void;
  updateQuantityById: (id: string, delta: number) => void;
  updateQuantityByName: (name: string, newQty: number, newUnit?: string) => void;
  updateWeightPortion: (id: string, newQty: number, newUnit: string) => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  checkoutCart: () => void;
  checkAndTriggerDepletionAlerts: () => void;
  setSuggestions: (suggs: SmartSuggestion[]) => void;
  clearSuggestions: () => void;
  clearNotifications: () => void;
  setBudgetLimit: (limit: number | null) => void;
  setSearchResults: (results: SearchProduct[], query?: string) => void;
  clearSearch: () => void;
  setListening: (status: boolean) => void;
  setTranscript: (text: string) => void;
  setLanguage: (lang: string) => void;
}

export const useShoppingStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],
      purchaseHistory: [
        { name: 'Hybrid Fresh Tomatoes', category: 'Produce', price: 40, lastBought: Date.now() - 5 * 86400000, count: 3, unit: '1 kg', depletionDays: 4 },
        { name: 'Desi Red Onions (Pyaaz)', category: 'Produce', price: 50, lastBought: Date.now() - 6 * 86400000, count: 2, unit: '1 kg', depletionDays: 6 },
        { name: 'Fresh Coriander Bunch (Dhaniya)', category: 'Produce', price: 20, lastBought: Date.now() - 4 * 86400000, count: 4, unit: '100 g', depletionDays: 3 },
        { name: 'Robusta Bananas', category: 'Produce', price: 60, lastBought: Date.now() - 4 * 86400000, count: 2, unit: '1 dozen', depletionDays: 3 },
        { name: 'Amul Taaza Toned Milk', category: 'Dairy & Plant', price: 33, lastBought: Date.now() - 4 * 86400000, count: 5, unit: '500 ml', depletionDays: 3 },
        { name: 'Whole Wheat Brown Bread', category: 'Bakery', price: 45, lastBought: Date.now() - 5 * 86400000, count: 3, unit: '400 g', depletionDays: 4 },
        { name: 'Aashirvaad Sharbati Atta', category: 'Pantry', price: 220, lastBought: Date.now() - 15 * 86400000, count: 1, unit: '5 kg', depletionDays: 30 }
      ].sort((a, b) => (b.lastBought || 0) - (a.lastBought || 0)),

      activeSuggestions: INITIAL_DEALS,
      unreadNotificationCount: 3,
      budgetLimit: 2000,
      searchResults: [],
      activeSearchQuery: null,
      isListening: false,
      selectedLanguage: 'en-IN',
      transcript: '',

      addItem: (item) =>
        set((state) => {
          const rawName = (item?.name || '').trim();
          if (!rawName) return state;

          const currentItems = Array.isArray(state.items) ? state.items : [];
          const existing = currentItems.find(
            (i) => (i?.name || '').toLowerCase() === rawName.toLowerCase()
          );

          const autoSub = item.substituteSuggestion || resolveSubstitute(rawName);
          const rawUnit = (item.unit || '1 kg').toLowerCase();
          
          let parsedQty = Number(item.quantity) || 1;
          let normalizedUnit = 'kg';
          let baseUnit = item.baseUnit || 'kg';
          const baseRate = Number(item.basePrice || item.price) || 40;

          if (rawUnit.includes('250g') || rawUnit.includes('250 g')) {
            parsedQty = 250;
            normalizedUnit = 'g';
            baseUnit = 'kg';
          } else if (rawUnit.includes('500g') || rawUnit.includes('500 g')) {
            parsedQty = 500;
            normalizedUnit = 'g';
            baseUnit = 'kg';
          } else if (rawUnit.includes('100g') || rawUnit.includes('100 g')) {
            parsedQty = 100;
            normalizedUnit = 'g';
            baseUnit = 'kg';
          } else if (rawUnit.includes('dozen')) {
            normalizedUnit = 'dozen';
            baseUnit = 'dozen';
          } else if (rawUnit.includes('g') && !rawUnit.includes('kg')) {
            normalizedUnit = 'g';
            baseUnit = 'kg';
            parsedQty = parsedQty > 10 ? parsedQty : 250;
          } else if (rawUnit.includes('kg')) {
            normalizedUnit = 'kg';
            baseUnit = 'kg';
          } else {
            normalizedUnit = item.unit || 'unit';
            baseUnit = 'unit';
          }

          const calculatedPrice = calculateProportionalPrice(parsedQty, normalizedUnit, baseRate, baseUnit);

          if (existing) {
            const nextQty = existing.unit === normalizedUnit 
              ? existing.quantity + parsedQty 
              : existing.quantity;

            return {
              items: currentItems.map((i) =>
                i.id === existing.id
                  ? { 
                      ...i, 
                      quantity: nextQty,
                      price: calculateProportionalPrice(nextQty, i.unit, i.basePrice, i.baseUnit),
                      substituteSuggestion: i.substituteSuggestion || autoSub
                    }
                  : i
              ),
            };
          }

          const newItem: ShoppingItem = {
            id: item.id || crypto.randomUUID(),
            name: rawName,
            quantity: parsedQty,
            unit: normalizedUnit,
            baseUnit: baseUnit,
            basePrice: baseRate,
            price: calculatedPrice,
            category: item.category && item.category.trim() ? item.category : 'Produce',
            image: item.image || '🥬',
            brand: item.brand,
            substitutionNote: item.substitutionNote,
            substituteSuggestion: autoSub,
            isSavedForLater: false,
          };

          return { items: [...currentItems, newItem] };
        }),

      updateWeightPortion: (id, newQty, newUnit) =>
        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : [];
          return {
            items: currentItems.map((i) =>
              i.id === id
                ? {
                    ...i,
                    quantity: newQty,
                    unit: newUnit,
                    price: calculateProportionalPrice(newQty, newUnit, i.basePrice, i.baseUnit)
                  }
                : i
            ),
          };
        }),

      swapItem: (oldItemId, sub) =>
        set((state) => {
          if (!oldItemId || !sub?.name) return state;
          const currentItems = Array.isArray(state.items) ? state.items : [];

          return {
            items: currentItems.map((i) =>
              i.id === oldItemId
                ? {
                    ...i,
                    name: sub.name,
                    basePrice: Number(sub.price) || i.basePrice,
                    price: Number(sub.price) || i.price,
                    unit: sub.unit || i.unit || '1 kg',
                    baseUnit: '1 kg',
                    category: sub.category || i.category || 'Pantry',
                    image: sub.image || '✨',
                    substituteSuggestion: undefined,
                    substitutionNote: `Swapped to ${sub.name}`
                  }
                : i
            ),
          };
        }),

      removeItem: (target) =>
        set((state) => {
          if (!target) return state;
          const searchKey = String(target).trim().toLowerCase();
          if (!searchKey) return state;

          const currentItems = Array.isArray(state.items) ? state.items : [];
          const currentSaved = Array.isArray(state.savedItems) ? state.savedItems : [];

          return {
            items: currentItems.filter((i) => i && i.id !== target && !(i.name || '').toLowerCase().includes(searchKey)),
            savedItems: currentSaved.filter((i) => i && i.id !== target && !(i.name || '').toLowerCase().includes(searchKey)),
          };
        }),

      updateQuantityById: (id, delta) =>
        set((state) => {
          if (!id) return state;
          const currentItems = Array.isArray(state.items) ? state.items : [];
          return {
            items: currentItems
              .map((i) => {
                if (i.id !== id) return i;
                const step = i.unit === 'g' ? (i.quantity <= 100 ? 50 : 250) : 1;
                const nextQty = Math.max(0, i.quantity + (delta * step));
                return {
                  ...i,
                  quantity: nextQty,
                  price: calculateProportionalPrice(nextQty, i.unit, i.basePrice, i.baseUnit)
                };
              })
              .filter((i) => i.quantity > 0),
          };
        }),

      updateQuantityByName: (name, newQty, newUnit) =>
        set((state) => {
          const searchKey = (name || '').trim().toLowerCase();
          if (!searchKey) return state;
          const currentItems = Array.isArray(state.items) ? state.items : [];

          return {
            items: currentItems
              .map((i) => {
                if ((i?.name || '').toLowerCase().includes(searchKey)) {
                  const targetUnit = newUnit || i.unit;
                  return {
                    ...i,
                    quantity: Math.max(1, Number(newQty) || 1),
                    unit: targetUnit,
                    price: calculateProportionalPrice(Number(newQty) || 1, targetUnit, i.basePrice, i.baseUnit)
                  };
                }
                return i;
              })
              .filter((i) => (Number(i.quantity) || 0) > 0),
          };
        }),

      saveForLater: (id) =>
        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : [];
          const currentSaved = Array.isArray(state.savedItems) ? state.savedItems : [];
          const item = currentItems.find((i) => i.id === id);
          if (!item) return state;
          return {
            items: currentItems.filter((i) => i.id !== id),
            savedItems: [...currentSaved, { ...item, isSavedForLater: true }],
          };
        }),

      moveToCart: (id) =>
        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : [];
          const currentSaved = Array.isArray(state.savedItems) ? state.savedItems : [];
          const item = currentSaved.find((i) => i.id === id);
          if (!item) return state;
          return {
            savedItems: currentSaved.filter((i) => i.id !== id),
            items: [...currentItems, { ...item, isSavedForLater: false }],
          };
        }),

      checkoutCart: () =>
        set((state) => {
          const currentItems = Array.isArray(state.items) ? state.items : [];
          if (currentItems.length === 0) return state;

          let updatedHistory = [...(Array.isArray(state.purchaseHistory) ? state.purchaseHistory : [])];
          const now = Date.now();

          currentItems.forEach((cartItem) => {
            const cartName = (cartItem?.name || '').trim().toLowerCase();
            if (!cartName) return;

            const histIndex = updatedHistory.findIndex((h) => {
              const histName = (h?.name || '').trim().toLowerCase();
              return histName === cartName || histName.includes(cartName) || cartName.includes(histName);
            });

            const depletionCycle =
              cartItem.category === 'Produce'
                ? 5
                : cartItem.category === 'Dairy & Plant'
                ? 3
                : cartItem.category === 'Bakery'
                ? 4
                : 25;

            if (histIndex > -1) {
              updatedHistory[histIndex] = {
                ...updatedHistory[histIndex],
                lastBought: now,
                count: (Number(updatedHistory[histIndex].count) || 0) + 1,
                price: Number(cartItem.price) || updatedHistory[histIndex].price,
              };
            } else {
              updatedHistory.unshift({
                name: cartItem.name,
                category: cartItem.category || 'Produce',
                price: Number(cartItem.price) || 40,
                unit: `${cartItem.quantity} ${cartItem.unit}`,
                lastBought: now,
                count: 1,
                depletionDays: depletionCycle,
              });
            }
          });

          updatedHistory.sort((a, b) => (b.lastBought || 0) - (a.lastBought || 0));

          return {
            items: [],
            purchaseHistory: updatedHistory,
          };
        }),

      checkAndTriggerDepletionAlerts: () => {
        const history = Array.isArray(get().purchaseHistory) ? get().purchaseHistory : [];
        const now = Date.now();
        const lowItems = history.filter((h) => {
          if (!h || !h.lastBought) return false;
          return ((now - h.lastBought) / 86400000) >= (h.depletionDays || 4);
        });

        if (lowItems.length > 0) {
          const restockAlerts: SmartSuggestion[] = lowItems.map((item) => ({
            name: item.name || 'Produce Item',
            price: Number(item.price) || 40,
            unit: item.unit || '1 kg',
            category: item.category || 'Produce',
            image: item.category === 'Dairy & Plant' ? '🥛' : '🥬',
            reason: `Bought ${Math.round((now - (item.lastBought || now)) / 86400000)} days ago. Estimated finished!`,
            type: 'restock_alert'
          }));

          const existingDeals = (Array.isArray(get().activeSuggestions) ? get().activeSuggestions : []).filter(
            (s) => s?.type === 'sale_deal'
          );

          const mergedDeals = existingDeals.length > 0 ? existingDeals : INITIAL_DEALS;

          set({
            activeSuggestions: [...restockAlerts, ...mergedDeals],
            unreadNotificationCount: restockAlerts.length + mergedDeals.length
          });
        }
      },

      setSuggestions: (suggs) => 
        set(() => {
          const safe = Array.isArray(suggs) ? suggs.filter(Boolean) : [];
          return { activeSuggestions: safe, unreadNotificationCount: safe.length };
        }),
      clearSuggestions: () => set({ activeSuggestions: INITIAL_DEALS, unreadNotificationCount: 0 }),
      clearNotifications: () => set({ unreadNotificationCount: 0 }),
      setBudgetLimit: (limit) => set({ budgetLimit: limit !== null ? Number(limit) : null }),
      setSearchResults: (results, query = '') => set({ 
        searchResults: Array.isArray(results) ? results.filter(Boolean) : [], 
        activeSearchQuery: query 
      }),
      clearSearch: () => set({ searchResults: [], activeSearchQuery: null }),
      setListening: (status) => set({ isListening: !!status }),
      setTranscript: (text) => set({ transcript: String(text || '') }),
      setLanguage: (lang) => set({ selectedLanguage: String(lang || 'en-IN') }),
    }),
    { name: 'voice-shopping-weight-store-v5' }
  )
);