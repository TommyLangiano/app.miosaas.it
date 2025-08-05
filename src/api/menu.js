'use client';

import { create } from 'zustand';

// ==============================|| MENU STORE ||============================== //

const useMenuStore = create((set, get) => ({
  menuMaster: {
    isDashboardDrawerOpened: true
  },
  menuMasterLoading: false,
  
  // Actions
  setMenuOpen: (isOpen) => set((state) => ({
    menuMaster: {
      ...state.menuMaster,
      isDashboardDrawerOpened: isOpen
    }
  })),
  
  setMenuLoading: (loading) => set(() => ({
    menuMasterLoading: loading
  }))
}));

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
  console.log('Active item:', openItem);
};

export default useMenuStore;