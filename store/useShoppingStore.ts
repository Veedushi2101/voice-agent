import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubstituteInfo {
  name: string;
  price: number;
  unit?: string;
  category?: string;
  image?: string;
  reason?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  image?: string;
  brand?: string;
  substitutionNote?: string;
  substituteSuggestion?: SubstituteInfo;
  isSavedForLater?: boolean;
}

export interface SmartSuggestion {
  title?: string;
  reason: string;
  type?: 'restock_alert' | 'sale_deal' | 'seasonal' | 'substitute';
  discountBadge?: string;
  item: {
    name: string;
    price: number;
    originalPrice?: number;
    category: string;
    image: string;
    unit?: string;
  };
}

export interface SearchProduct {
  id?: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
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
  depletionDays: number; // e.g. 5 days for milk, 30 days for rice
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
  
  addItem: (item: Omit<ShoppingItem, 'id'>) => void;
  removeItem: (idOrName: string) => void;
  swapItem: (oldItemId: string, substitute: SubstituteInfo) => void;
  updateQuantityById: (id: string, delta: number) => void;
  updateQuantityByName: (name: string, newQty: number, newUnit?: string) => void;
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
        { 
          name: 'Whole Wheat Bread', 
          category: 'Bakery', 
          price: 45, 
          lastBought: Date.now() - 6 * 86400000, 
          count: 3, 
          unit: 'loaf', 
          depletionDays: 4 // Trigger alert: bought 6 days ago > 4 days lifecycle
        },
        { 
          name: 'Toned Milk', 
          category: 'Dairy & Plant', 
          price: 68, 
          lastBought: Date.now() - 5 * 86400000, 
          count: 5, 
          unit: 'packets', 
          depletionDays: 3 // Trigger alert: bought 5 days ago > 3 days lifecycle
        },
        {
          name: 'Basmati Rice',
          category: 'Pantry',
          price: 180,
          lastBought: Date.now() - 10 * 86400000,
          count: 2,
          unit: 'kg',
          depletionDays: 30 // Safe: bought 10 days ago < 30 days lifecycle
        }
      ],
      activeSuggestions: [],
      unreadNotificationCount: 0,
      budgetLimit: 2000,
      searchResults: [],
      activeSearchQuery: null,
      isListening: false,
      selectedLanguage: 'en-IN',
      transcript: '',

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? { 
                      ...i, 
                      quantity: i.quantity + (Number(item.quantity) || 1),
                      unit: item.unit || i.unit || 'unit',
                      substituteSuggestion: item.substituteSuggestion || i.substituteSuggestion
                    }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...item,
                id: crypto.randomUUID(),
                price: Number(item.price) || 50,
                quantity: Number(item.quantity) || 1,
                unit: item.unit && item.unit.trim() ? item.unit : 'unit',
                category: item.category && item.category.trim() ? item.category : 'Pantry',
                image: item.image || '🛒',
                substituteSuggestion: item.substituteSuggestion || undefined
              },
            ],
          };
        }),

      swapItem: (oldItemId, sub) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === oldItemId
              ? {
                  ...i,
                  name: sub.name,
                  price: Number(sub.price) || i.price,
                  unit: sub.unit || i.unit || 'unit',
                  category: sub.category || i.category || 'Pantry',
                  image: sub.image || '✨',
                  substituteSuggestion: undefined,
                  substitutionNote: `Swapped to ${sub.name}`
                }
              : i
          ),
        })),

      removeItem: (target) =>
        set((state) => ({
          items: state.items.filter(
            (i) => i.id !== target && !i.name.toLowerCase().includes(target.toLowerCase())
          ),
          savedItems: state.savedItems.filter(
            (i) => i.id !== target && !i.name.toLowerCase().includes(target.toLowerCase())
          ),
        })),

      updateQuantityById: (id, delta) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0),
        })),

      updateQuantityByName: (name, newQty, newUnit) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (i.name.toLowerCase().includes(name.toLowerCase())) {
                return {
                  ...i,
                  quantity: Math.max(1, newQty),
                  unit: newUnit && newUnit.trim() ? newUnit : i.unit,
                };
              }
              return i;
            })
            .filter((i) => i.quantity > 0),
        })),

      saveForLater: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return state;
          return {
            items: state.items.filter((i) => i.id !== id),
            savedItems: [...state.savedItems, { ...item, isSavedForLater: true }],
          };
        }),

      moveToCart: (id) =>
        set((state) => {
          const item = state.savedItems.find((i) => i.id === id);
          if (!item) return state;
          return {
            savedItems: state.savedItems.filter((i) => i.id !== id),
            items: [...state.items, { ...item, isSavedForLater: false }],
          };
        }),

      checkoutCart: () =>
        set((state) => {
          const updatedHistory = [...state.purchaseHistory];
          state.items.forEach((item) => {
            const histIndex = updatedHistory.findIndex((h) => h.name.toLowerCase() === item.name.toLowerCase());
            const depletionCycle = item.category === 'Dairy & Plant' ? 3 : item.category === 'Bakery' ? 4 : item.category === 'Produce' ? 5 : 25;
            
            if (histIndex > -1) {
              updatedHistory[histIndex].lastBought = Date.now();
              updatedHistory[histIndex].count += item.quantity;
            } else {
              updatedHistory.push({
                name: item.name,
                category: item.category,
                price: item.price,
                unit: item.unit || 'unit',
                lastBought: Date.now(),
                count: item.quantity,
                depletionDays: depletionCycle,
              });
            }
          });
          return { items: [], purchaseHistory: updatedHistory };
        }),

      // Evaluates past purchase timestamps against item life cycles
      checkAndTriggerDepletionAlerts: () => {
        const history = get().purchaseHistory;
        const now = Date.now();
        const lowItems = history.filter((h) => {
          const daysPassed = (now - h.lastBought) / 86400000;
          return daysPassed >= (h.depletionDays || 5);
        });

        if (lowItems.length > 0) {
          const restockAlerts: SmartSuggestion[] = lowItems.map((item) => ({
            title: '⚠️ Running Low Alert',
            type: 'restock_alert',
            reason: `Bought ${Math.round((now - item.lastBought) / 86400000)} days ago. Estimated out of stock!`,
            item: {
              name: item.name,
              price: item.price,
              category: item.category,
              image: item.category === 'Dairy & Plant' ? '🥛' : item.category === 'Bakery' ? '🍞' : '🛒',
              unit: item.unit || 'unit'
            }
          }));

          set({
            activeSuggestions: [...restockAlerts, ...get().activeSuggestions.filter(s => s.type !== 'restock_alert')],
            unreadNotificationCount: restockAlerts.length
          });
        }
      },

      setSuggestions: (suggs) => 
        set((state) => ({ 
          activeSuggestions: Array.isArray(suggs) ? suggs : [], 
          unreadNotificationCount: Array.isArray(suggs) ? suggs.length : 0 
        })),
      clearSuggestions: () => set({ activeSuggestions: [], unreadNotificationCount: 0 }),
      clearNotifications: () => set({ unreadNotificationCount: 0 }),
      setBudgetLimit: (limit) => set({ budgetLimit: limit }),
      setSearchResults: (results, query = '') => set({ searchResults: Array.isArray(results) ? results : [], activeSearchQuery: query }),
      clearSearch: () => set({ searchResults: [], activeSearchQuery: null }),
      setListening: (status) => set({ isListening: status }),
      setTranscript: (text) => set({ transcript: text }),
      setLanguage: (lang) => set({ selectedLanguage: lang }),
    }),
    { name: 'voice-shopping-complete-store' }
  )
);