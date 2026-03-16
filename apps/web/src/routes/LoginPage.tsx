import { gql, useMutation } from "@apollo/client";
import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth";

const demoAccounts = [
	{
		label: "Alice Martin",
		email: "alice@realadvisor.local",
		password: "password123",
	},
	{
		label: "Julien Morel",
		email: "julien@realadvisor.local",
		password: "password123",
	},
	{
		label: "Sophie Keller",
		email: "sophie@realadvisor.local",
		password: "password123",
	},
] as const;

const LOGIN_MUTATION = gql`
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
	const [email, setEmail] = useState("alice@realadvisor.local");
	const [password, setPassword] = useState("password123");
	const [formError, setFormError] = useState<string | null>(null);
	const [login, { loading }] = useMutation(LOGIN_MUTATION);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError(null);

		try {
			const result = await login({
				variables: {
					email,
					password,
				},
			});

			const payload = result.data?.login;

			if (!payload) {
				setFormError("Login failed. Please try again.");
				return;
			}

			setSession(payload);

			const nextPath = (
				location.state as { from?: { pathname?: string } } | null
			)?.from?.pathname;
			navigate(nextPath ?? "/dashboard", { replace: true });
		} catch (error) {
			setFormError(
				error instanceof Error
					? error.message
					: "Login failed. Please try again.",
			);
		}
	};

	return (
		<main className='min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,142,66,0.14),_transparent_28%),linear-gradient(180deg,_#f8f4ec_0%,_#f3ede2_100%)] px-6 py-10'>
			<div className='mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center mb-20 sm:mb-0'>
				<section className='grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-ink/10 bg-white/85 shadow-xl lg:grid-cols-[1.1fr_0.9fr]'>
					<div className='bg-pine px-8 py-10 text-white sm:px-12'>
						<p className='text-sm font-semibold uppercase tracking-[0.3em] text-gold'>
							Secure Access
						</p>
						<h1 className='mt-4 text-4xl font-semibold tracking-tight'>
							Monitor portfolio performance and suspicious listings.
						</h1>
						<p className='mt-4 max-w-md text-base leading-7 text-white/75'>
							Sign in with one of the seeded agent accounts to review portfolio
							metrics, flagged listings, and property activity across the
							challenge dataset.
						</p>
						<div className='mt-8 rounded-[1.75rem] border border-white/10 bg-white/10 p-5'>
							<p className='text-xs font-semibold uppercase tracking-[0.22em] text-gold/90'>
								Demo Accounts
							</p>
							<div className='mt-4 grid gap-3'>
								{demoAccounts.map((account) => (
									<button
										key={account.email}
										className='rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10'
										type='button'
										onClick={() => {
											setEmail(account.email);
											setPassword(account.password);
											setFormError(null);
										}}>
										<p className='text-sm font-semibold text-white'>
											{account.label}
										</p>
										<p className='mt-1 text-sm text-white/65'>
											{account.email}
										</p>
									</button>
								))}
							</div>
						</div>
					</div>

					<div className='px-8 py-10 sm:px-12'>
						<h2 className='text-2xl font-semibold text-ink'>Sign in</h2>
						<p className='mt-2 text-sm leading-6 text-ink/60'>
							Use a seeded account or enter your own local credentials if you
							changed the dataset.
						</p>
						<form className='mt-8 space-y-5' onSubmit={handleSubmit}>
							<label className='block'>
								<span className='mb-2 block text-sm font-medium text-ink/70'>
									Email
								</span>
								<input
									className='w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-pine'
									type='email'
									placeholder='agent@realadvisor.local'
									value={email}
									onChange={(event) => setEmail(event.target.value)}
								/>
							</label>
							<label className='block'>
								<span className='mb-2 block text-sm font-medium text-ink/70'>
									Password
								</span>
								<input
									className='w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base outline-none transition focus:border-pine'
									type='password'
									placeholder='••••••••'
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
							</label>
							{formError ? (
								<p className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
									{formError}
								</p>
							) : null}
							<button
								className='w-full rounded-2xl bg-ink px-4 py-3 text-base font-semibold text-white transition hover:bg-pine'
								type='submit'
								disabled={loading}>
								{loading ? "Signing in..." : "Continue"}
							</button>
						</form>
					</div>
				</section>
			</div>
		</main>
	);
};
