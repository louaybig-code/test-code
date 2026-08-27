import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { apiService, getAccessToken, getRefreshTokenFromStorage, setAccessToken, setRefreshTokenInStorage } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
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
      // If we already have an access token (survived via sessionStorage), just fetch the user
      const existingAccessToken = getAccessToken();
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
      const storedRefreshToken = getRefreshTokenFromStorage();
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
            // Refresh succeeded but returned no token — clear everything
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

  const loginAsDemo = async () => {
    setIsLoading(true);
    const demoEmail = `demo.${Math.floor(Math.random() * 100000)}@smash.app`;
    const demoPass = 'SmashDemo123!';
    try {
      const tokens = await apiService.register({
        email: demoEmail,
        password: demoPass,
        firstName: 'Alexandre',
        lastName: 'Dev',
      });
      setAccessToken(tokens.accessToken);
      setRefreshTokenInStorage(tokens.refreshToken);
      await fetchCurrentUser();
    } catch {
      // Fallback demo user if remote API cannot process registration
      setUser({
        id: 'demo-user-1',
        email: 'demo@smash.app',
        firstName: 'Alexandre',
        lastName: 'Dev',
        roles: ['ADMIN'],
        notificationSettings: { inApp: true, email: true, push: false },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = getRefreshTokenFromStorage();
    if (refreshToken) {
      try {
        await apiService.logout(refreshToken);
      } catch {
        // ignore logout errors
      }
    }
    setAccessToken(null);
    setRefreshTokenInStorage(null);
    sessionStorage.removeItem('smash_access_token');
    // Clear navigation sessionStorage on logout
    sessionStorage.removeItem('sp_activeScreen');
    sessionStorage.removeItem('sp_activeOrgId');
    sessionStorage.removeItem('sp_activeWsId');
    sessionStorage.removeItem('sp_activeProjId');
    sessionStorage.removeItem('sp_activeView');
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
        loginAsDemo,
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
