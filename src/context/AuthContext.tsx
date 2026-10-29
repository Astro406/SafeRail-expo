import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService, authService as defaultAuthService } from '../services';
import { UserProfile } from '../types';

interface AuthContextValue {
  currentUser: UserProfile | null;
  user: UserProfile | null; // UI alias
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  error: string | null; // UI alias
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>; // UI alias
  register: (
    emailOrParams: string | { displayName: string; email: string; password: string; stationCode?: string },
    password?: string,
    displayName?: string,
    badgeId?: string,
    station?: string
  ) => Promise<boolean>;
  signInAsDemoOfficer: () => Promise<void>;
  loginDemo: () => Promise<void>; // UI alias
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // UI alias
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  authService?: AuthService;
}> = ({ children, authService = defaultAuthService }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.currentUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = authService.onAuthStateChanged((u) => {
      if (u) {
        const enriched: UserProfile = {
          ...u,
          name: u.displayName || 'Security Officer',
          badgeId: (u as any).badgeId || 'RPF-7489',
          station: u.stationCode || 'Platform Screening',
        };
        setCurrentUser(enriched);
      } else {
        setCurrentUser(null);
      }
      setIsInitialized(true);
    });
    return unsub;
  }, [authService]);

  const clearError = () => {
    setErrorMessage(null);
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    clearError();
    try {
      const u = await authService.signInWithEmailAndPassword(email, password);
      const enriched: UserProfile = {
        ...u,
        name: u.displayName || 'Security Officer',
        badgeId: (u as any).badgeId || 'RPF-7489',
        station: u.stationCode || 'Platform Screening',
      };
      setCurrentUser(enriched);
      return true;
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    emailOrParams: string | { displayName: string; email: string; password: string; stationCode?: string },
    password?: string,
    displayName?: string,
    badgeId?: string,
    station?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    clearError();
    try {
      let emailVal = '';
      let passVal = '';
      let nameVal = '';
      let stationVal = '';

      if (typeof emailOrParams === 'object') {
        emailVal = emailOrParams.email;
        passVal = emailOrParams.password;
        nameVal = emailOrParams.displayName;
        stationVal = emailOrParams.stationCode || 'Central Railway Hub';
      } else {
        emailVal = emailOrParams;
        passVal = password || '';
        nameVal = displayName || '';
        stationVal = station || 'Central Railway Hub';
      }

      const u = await authService.registerWithEmailAndPassword({
        email: emailVal,
        password: passVal,
        displayName: nameVal,
        stationCode: stationVal,
      });

      const enriched: UserProfile = {
        ...u,
        name: nameVal || u.displayName,
        badgeId: badgeId || 'RPF-8392',
        station: stationVal || u.stationCode,
      };
      setCurrentUser(enriched);
      return true;
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsDemoOfficer = async (): Promise<void> => {
    setIsLoading(true);
    clearError();
    try {
      const u = await authService.signInAsDemoOfficer();
      const enriched: UserProfile = {
        ...u,
        name: u.displayName || 'Inspector S. Sharma',
        badgeId: 'RPF-7489',
        station: 'NDLS-PLATFORM-01',
      };
      setCurrentUser(enriched);
    } catch (e: any) {
      setErrorMessage(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        isAuthenticated: currentUser !== null,
        isLoading,
        isInitialized,
        errorMessage,
        error: errorMessage,
        clearError,
        signIn,
        login: signIn,
        register,
        signInAsDemoOfficer,
        loginDemo: signInAsDemoOfficer,
        signOut,
        logout: signOut,
        getIdToken: () => authService.getIdToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
