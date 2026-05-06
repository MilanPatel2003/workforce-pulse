import { create } from 'zustand'

export const useStore = create((set) => ({
  data: null,
  metrics: null,
  loading: true,
  error: null,
  filters: { department: null, taskCategory: null },
  theme: localStorage.getItem('theme') || 'dark',

  setData: (data) => set({ data }),
  setMetrics: (metrics) => set({ metrics }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilter: (key, val) =>
    set((s) => ({ filters: { ...s.filters, [key]: s.filters[key] === val ? null : val } })),
  clearFilters: () => set({ filters: { department: null, taskCategory: null } }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))
