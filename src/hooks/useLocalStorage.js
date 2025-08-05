'use client';

import { useState, useEffect } from 'react';

// ==============================|| HOOKS - LOCAL STORAGE ||============================== //

export default function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  
  useEffect(() => {
    // Solo dopo l'idratazione leggiamo dal localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) {
          setValue(JSON.parse(storedValue));
        }
      } catch (error) {
        console.error('Errore nel leggere localStorage:', error);
      }
    }
  }, [key]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const listener = (e) => {
        if (e.storageArea === localStorage && e.key === key) {
          setValue(e.newValue ? JSON.parse(e.newValue) : e.newValue);
        }
      };
      window.addEventListener('storage', listener);

      return () => {
        window.removeEventListener('storage', listener);
      };
    }
  }, [key]);

  const setValueInLocalStorage = (newValue) => {
    setValue((currentValue) => {
      const result = typeof newValue === 'function' ? newValue(currentValue) : newValue;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(result));
        } catch (error) {
          console.error('Errore nel salvare in localStorage:', error);
        }
      }
      return result;
    });
  };

  return [value, setValueInLocalStorage];
}
