import { useState, useEffect } from 'react';

// Simulate global state
let globalIsLoggedIn = false;
let listeners: Array<(val: boolean) => void> = [];

export function useAuth() {
  const [isLoggedIn, setIsLoggedInState] = useState<boolean | null>(null);

  useEffect(() => {
    setIsLoggedInState(globalIsLoggedIn);
    
    const listener = (val: boolean) => setIsLoggedInState(val);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const setLoggedIn = (val: boolean) => {
    globalIsLoggedIn = val;
    listeners.forEach(l => l(val));
  };

  return { isLoggedIn, setLoggedIn };
}
