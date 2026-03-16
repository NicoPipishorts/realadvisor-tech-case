import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const STORAGE_KEY = 'realadvisor.auth';
const AuthContext = createContext(null);
const readStoredState = () => {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};
export const getStoredToken = () => readStoredState()?.token ?? null;
export const AuthProvider = ({ children }) => {
    const [state, setState] = useState(null);
    useEffect(() => {
        setState(readStoredState());
    }, []);
    const value = useMemo(() => ({
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
    }), [state]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
