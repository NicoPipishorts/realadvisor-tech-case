import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
const LOGIN_MUTATION = gql `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      agent {
        id
        name
        email
      }
    }
  }
`;
export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setSession } = useAuth();
    const [email, setEmail] = useState('alice@realadvisor.local');
    const [password, setPassword] = useState('password123');
    const [formError, setFormError] = useState(null);
    const [login, { loading }] = useMutation(LOGIN_MUTATION);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);
        try {
            const result = await login({
                variables: {
                    email,
                    password
                }
            });
            const payload = result.data?.login;
            if (!payload) {
                setFormError('Login failed. Please try again.');
                return;
            }
            setSession(payload);
            const nextPath = location.state?.from?.pathname;
            navigate(nextPath ?? '/dashboard', { replace: true });
        }
        catch (error) {
            setFormError(error instanceof Error ? error.message : 'Login failed. Please try again.');
        }
    };
    return (_jsx("main", { className: "flex min-h-screen items-center justify-center px-6 py-10", children: _jsxs("section", { className: "grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-ink/10 bg-white/85 shadow-xl lg:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("div", { className: "bg-pine px-8 py-10 text-white sm:px-12", children: [_jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.3em] text-gold", children: "Secure Access" }), _jsx("h1", { className: "mt-4 text-4xl font-semibold tracking-tight", children: "Monitor portfolio performance and suspicious listings." }), _jsx("p", { className: "mt-4 max-w-md text-base leading-7 text-white/75", children: "The login flow is scaffolded and ready for the JWT-backed GraphQL mutation in the next step." })] }), _jsxs("div", { className: "px-8 py-10 sm:px-12", children: [_jsx("h2", { className: "text-2xl font-semibold text-ink", children: "Sign in" }), _jsxs("form", { className: "mt-8 space-y-5", onSubmit: handleSubmit, children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-2 block text-sm font-medium text-ink/70", children: "Email" }), _jsx("input", { className: "w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-pine", type: "email", placeholder: "agent@realadvisor.local", value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-2 block text-sm font-medium text-ink/70", children: "Password" }), _jsx("input", { className: "w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-pine", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (event) => setPassword(event.target.value) })] }), formError ? (_jsx("p", { className: "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", children: formError })) : null, _jsx("button", { className: "w-full rounded-2xl bg-ink px-4 py-3 text-base font-semibold text-white transition hover:bg-pine", type: "submit", disabled: loading, children: loading ? 'Signing in...' : 'Continue' })] })] })] }) }));
};
