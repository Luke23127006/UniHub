import { useState, useEffect } from 'react';
import { AuthService } from '@/features/auth/services/AuthService';

// Simulate global state
let globalIsLoggedIn = false;
let globalUser: any = null;
let listeners: ((val: boolean, user: any) => void)[] = [];

export function useAuth() {
  const [isLoggedIn, setIsLoggedInState] = useState<boolean | null>(null);
  const [user, setUserState] = useState<any>(null);

  useEffect(() => {
    // Check if we have a token already saved
    const checkAuth = async () => {
      const token = await AuthService.getToken();
      if (token) {
        // In a real app, we'd fetch user profile here
        setLoggedIn(true, globalUser); 
      } else {
        setIsLoggedInState(globalIsLoggedIn);
        setUserState(globalUser);
      }
    };
    
    checkAuth();
    
    const listener = (val: boolean, u: any) => {
      setIsLoggedInState(val);
      setUserState(u);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const setLoggedIn = (val: boolean, userData: any = null) => {
    globalIsLoggedIn = val;
    globalUser = userData;
    listeners.forEach(l => l(val, userData));
  };

  const logout = async () => {
    await AuthService.logout();
    setLoggedIn(false, null);
  };

  return { isLoggedIn, user, setLoggedIn, logout };
}
