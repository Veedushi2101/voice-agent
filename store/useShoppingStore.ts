import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  price: number;
  image?: string;
  brand?: string;
  substitutionNote?: string;
  isSavedForLater?: boolean;
}

export interface SmartSuggestion {
  title?: string;
  reason: string;
  item: {
    name: string;
    price: number;
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
  unit?: string;
  category?: string;
  image?: string;
}

interface StoreState {
  items: ShoppingItem[];
  savedItems: ShoppingItem[];
  purchaseHistory: { name: string; category: string; price: number; lastBought: number; count: number; unit?: string }[];
  activeSuggestions: SmartSuggestion[];
  budgetLimit: number | null;
  searchResults: SearchProduct[];
  activeSearchQuery: string | null;
  isListening: boolean;
  selectedLanguage: string;
  transcript: string;
  
  addItem: (item: Omit<ShoppingItem, 'id'>) => void;
  removeItem: (idOrName: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateQuantityById: (id: string, delta: number) => void;
  updateQuantityByName: (name: string, newQty: number) => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  checkoutCart: () => void;
  setSuggestions: (suggs: SmartSuggestion[]) => void;
  clearSuggestions: () => void;
  setBudgetLimit: (limit: number | null) => void;
  setSearchResults: (results: SearchProduct[], query?: string) => void;
  clearSearch: () => void;
  setListening: (status: boolean) => void;
  setTranscript: (text: string) => void;
  setLanguage: (lang: string) => void;
}

export const useShoppingStore = create<StoreState>()(
  persist(
    (set) => ({
      items: [],
      savedItems: [],
      purchaseHistory: [
        { name: 'Whole Wheat Bread', category: 'Bakery', price: 45, lastBought: Date.now() - 6 * 86400000, count: 3, unit: 'loaf' },
        { name: 'Toned Milk', category: 'Dairy & Plant', price: 68, lastBought: Date.now() - 5 * 86400000, count: 5, unit: 'packets' }
      ],
      activeSuggestions: [],
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
                      unit: item.unit || i.unit || 'unit'
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
              },
            ],
          };
        }),

      removeItem: (target) =>
        set((state) => ({
          items: state.items.filter(
            (i) => i.id !== target && !i.name.toLowerCase().includes(target.toLowerCase())
          ),
          savedItems: state.savedItems.filter(
            (i) => i.id !== target && !i.name.toLowerCase().includes(target.toLowerCase())
          ),
        })),

      updateQuantity: (id, delta) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0),
        })),

      updateQuantityById: (id, delta) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0),
        })),

      updateQuantityByName: (name, newQty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.name.toLowerCase().includes(name.toLowerCase()) ? { ...i, quantity: newQty } : i))
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
              });
            }
          });
          return { items: [], purchaseHistory: updatedHistory };
        }),

      setSuggestions: (suggs) => set({ activeSuggestions: Array.isArray(suggs) ? suggs : [] }),
      clearSuggestions: () => set({ activeSuggestions: [] }),
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