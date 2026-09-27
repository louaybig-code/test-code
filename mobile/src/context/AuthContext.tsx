import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  apiService,
  getAccessToken,
  getRefreshTokenFromStorage,
  setAccessToken,
  setRefreshTokenInStorage,
  hydrateAccessToken,
} from '../services/api';
import { store, K } from '../lib/storage';

interface AuthContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const me = await apiService.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // If we already have an access token (restored from storage), just fetch the user
      const existingAccessToken = await hydrateAccessToken();
      if (existingAccessToken) {
        try {
          await fetchCurrentUser();
          setIsLoading(false);
          return;
        } catch {
          // Access token is stale — fall through to refresh
          setAccessToken(null);
        }
      }

      // Try to get a fresh access token using the stored refresh token
      const storedRefreshToken = await getRefreshTokenFromStorage();
      if (storedRefreshToken) {
        try {
          const tokenData = await apiService.refresh(storedRefreshToken);
          if (tokenData?.accessToken) {
            setAccessToken(tokenData.accessToken);
            if (tokenData.refreshToken) {
              setRefreshTokenInStorage(tokenData.refreshToken);
            }
            await fetchCurrentUser();
          } else {
            setAccessToken(null);
            setRefreshTokenInStorage(null);
          }
        } catch {
          // Refresh token is expired or invalid — log out cleanly
          setAccessToken(null);
          setRefreshTokenInStorage(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await apiService.login({ email, password });
    setAccessToken(tokens.accessToken);
    setRefreshTokenInStorage(tokens.refreshToken);
    await fetchCurrentUser();
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const tokens = await apiService.register({ email, password, firstName, lastName });
    setAccessToken(tokens.accessToken);
    setRefreshTokenInStorage(tokens.refreshToken);
    await fetchCurrentUser();
  };

  const logout = async () => {
    const refreshToken = await getRefreshTokenFromStorage();
    if (refreshToken) {
      try {
        await apiService.logout(refreshToken);
      } catch {
        // ignore logout errors
      }
    }
    setAccessToken(null);
    setRefreshTokenInStorage(null);
    // Clear navigation state on logout (same keys as web)
    await store.removeMany([
      K.activeScreen,
      K.activeOrgId,
      K.activeWsId,
      K.activeProjId,
      K.activeView,
    ]);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        login,
        register,
        logout,
        refetchUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
