'use client';

import { create } from 'zustand';

// ==============================|| MENU STORE ||============================== //

const useMenuStore = create((set, get) => ({
  menuMaster: {
    // Persistenza stato drawer in localStorage per evitare chiusure inattese
    isDashboardDrawerOpened: typeof window !== 'undefined' ? (localStorage.getItem('drawer_open') === '1') : false,
    openedItem: ''
  },
  menuMasterLoading: false,
  
  // Actions
  setMenuOpen: (isOpen) => set((state) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('drawer_open', isOpen ? '1' : '0');
    } catch {}
    return {
      menuMaster: {
        ...state.menuMaster,
        isDashboardDrawerOpened: isOpen
      }
    };
  }),
  setActiveItem: (itemId) => set((state) => ({
    menuMaster: {
      ...state.menuMaster,
      openedItem: itemId
    }
  })),
  
  setMenuLoading: (loading) => set(() => ({
    menuMasterLoading: loading
  }))
}));

// Imposta default coerente a viewport se non esiste preferenza salvata
if (typeof window !== 'undefined' && localStorage.getItem('drawer_open') == null) {
  const prefersMobile = window.matchMedia('(max-width: 960px)').matches; // md breakpoint ~ 960
  try {
    localStorage.setItem('drawer_open', prefersMobile ? '0' : '1');
  } catch {}
  useMenuStore.getState().setMenuOpen(!prefersMobile);
}

// Hook per ottenere i dati del menu
export const useGetMenuMaster = () => {
  const { menuMaster, menuMasterLoading } = useMenuStore();
  return { menuMaster, menuMasterLoading };
};

// Hook per ottenere il menu (placeholder per ora)
export const useGetMenu = () => {
  return { menu: null, menuLoading: false };
};

// Handler per aprire/chiudere il drawer
export const handlerDrawerOpen = (isOpen) => {
  useMenuStore.getState().setMenuOpen(isOpen);
};

// Handler per item attivo (placeholder per ora)
export const handlerActiveItem = (openItem) => {
  useMenuStore.getState().setActiveItem(openItem);
};

export default useMenuStore;