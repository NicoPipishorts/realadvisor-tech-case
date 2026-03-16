import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';

type AgentSession = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  token: string;
  agent: AgentSession;
};

type AuthContextValue = {
  agent: AgentSession | null;
  isAuthenticated: boolean;
  token: string | null;
  setSession: (nextState: AuthState) => void;
  clearSession: () => void;
};

const STORAGE_KEY = 'realadvisor.auth';

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredState = (): AuthState | null => {
  const value = window.localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const getStoredToken = () => readStoredState()?.token ?? null;

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => {
    setState(readStoredState());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      agent: state?.agent ?? null,
      isAuthenticated: Boolean(state?.token),
      token: state?.token ?? null,
      setSession: (nextState) => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        setState(nextState);
      },
      clearSession: () => {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(null);
      }
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
