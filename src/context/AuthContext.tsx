import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserAccount } from '../types';
import * as auth from '../services/auth';
import type { AuthResult, SignupResult, SignUpParams } from '../services/auth';

interface AuthContextValue {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResult>;
  logout: () => void;
  signUp: (params: SignUpParams) => Promise<SignupResult>;
  verifyOTP: (email: string, otp: string) => Promise<AuthResult>;
  resendOTP: (email: string) => Promise<SignupResult>;
  requestPasswordReset: (email: string) => Promise<SignupResult>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => auth.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session from the HttpOnly cookie on first load.
  useEffect(() => {
    auth.initAuth().then(() => {
      setUser(auth.getCurrentUser());
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe?: boolean): Promise<AuthResult> => {
      const result = await auth.login(email, password, rememberMe);
      if (result.success) setUser(auth.getCurrentUser());
      return result;
    },
    [],
  );

  const logout = useCallback(() => {
    // Fire-and-forget: revoke the server session then clear local state.
    auth.logout().then(() => setUser(null));
  }, []);

  const signUpFn = useCallback(async (params: SignUpParams): Promise<SignupResult> => {
    return auth.signUp(params);
  }, []);

  const verifyOTPFn = useCallback(async (email: string, otp: string): Promise<AuthResult> => {
    return auth.verifyOTP(email, otp);
  }, []);

  const resendOTPFn = useCallback(async (email: string): Promise<SignupResult> => {
    return auth.resendOTP(email);
  }, []);

  const requestPasswordResetFn = useCallback(async (email: string): Promise<SignupResult> => {
    return auth.requestPasswordReset(email);
  }, []);

  const resetPasswordFn = useCallback(
    async (email: string, token: string, newPassword: string): Promise<AuthResult> => {
      return auth.resetPassword(email, token, newPassword);
    },
    [],
  );

  const changePasswordFn = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
      return auth.changePassword('', currentPassword, newPassword);
    },
    [],
  );

  const refreshUser = useCallback(() => {
    auth.refreshUser().then(() => setUser(auth.getCurrentUser()));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        signUp: signUpFn,
        verifyOTP: verifyOTPFn,
        resendOTP: resendOTPFn,
        requestPasswordReset: requestPasswordResetFn,
        resetPassword: resetPasswordFn,
        changePassword: changePasswordFn,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};