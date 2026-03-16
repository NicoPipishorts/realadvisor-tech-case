import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../lib/auth";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
	[
		"rounded-full px-3 py-2 text-sm font-medium transition-colors md:px-4",
		isActive
			? "bg-pine text-white"
			: "text-ink/70 hover:bg-white/60 hover:text-ink",
	].join(" ");

const DashboardIcon = () => (
	<svg
		aria-hidden='true'
		className='h-4 w-4'
		fill='none'
		viewBox='0 0 24 24'
		xmlns='http://www.w3.org/2000/svg'>
		<path
			d='M4.5 5.25h6.75v6.75H4.5V5.25Zm8.25 0h6.75v4.5h-6.75v-4.5ZM12.75 11.25h6.75v7.5h-6.75v-7.5Zm-8.25 2.25h6.75v5.25H4.5V13.5Z'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='1.6'
		/>
	</svg>
);

const PropertiesIcon = () => (
	<svg
		aria-hidden='true'
		className='h-4 w-4'
		fill='none'
		viewBox='0 0 24 24'
		xmlns='http://www.w3.org/2000/svg'>
		<path
			d='M5.25 6.75h13.5M5.25 12h13.5M5.25 17.25h13.5'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='1.6'
		/>
		<circle cx='7.5' cy='6.75' r='0.75' fill='currentColor' />
		<circle cx='7.5' cy='12' r='0.75' fill='currentColor' />
		<circle cx='7.5' cy='17.25' r='0.75' fill='currentColor' />
	</svg>
);

const SignOutIcon = () => (
	<svg
		aria-hidden='true'
		className='h-4 w-4'
		fill='none'
		viewBox='0 0 24 24'
		xmlns='http://www.w3.org/2000/svg'>
		<path
			d='M10.5 5.25H7.5A2.25 2.25 0 0 0 5.25 7.5v9A2.25 2.25 0 0 0 7.5 18.75h3'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='1.6'
		/>
		<path
			d='M13.5 8.25 18 12l-4.5 3.75M18 12H9'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='1.6'
		/>
	</svg>
);

export const AppShell = () => {
	const { agent, clearSession } = useAuth();

	return (
		<div className='min-h-screen'>
			<header className='border-b border-ink/10 bg-white/70 backdrop-blur'>
				<div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.28em] text-gold'>
							RealAdvisor
						</p>
						<h1 className='text-xl font-semibold text-ink'>Agent Dashboard</h1>
					</div>
					<div className='flex flex-col items-end gap-1'>
						<p className='pr-2 text-right text-sm font-medium text-ink'>
							{agent?.name}
						</p>
						<div className='flex items-center gap-2'>
							<nav className='flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 p-1'>
								<NavLink to='/dashboard' className={navLinkClassName}>
									<span className='md:hidden'>
										<DashboardIcon />
									</span>
									<span className='sr-only md:not-sr-only'>Dashboard</span>
								</NavLink>
								<NavLink to='/properties' className={navLinkClassName}>
									<span className='md:hidden'>
										<PropertiesIcon />
									</span>
									<span className='sr-only md:not-sr-only'>Properties</span>
								</NavLink>
							</nav>
							<button
								className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink/55 transition hover:bg-white hover:text-ink md:h-auto md:w-auto md:px-4 md:py-2 md:text-sm md:font-medium md:text-ink/70'
								type='button'
								onClick={clearSession}>
								<span className='md:hidden'>
									<SignOutIcon />
								</span>
								<span className='sr-only md:not-sr-only md:p-1'>Sign out</span>
							</button>
						</div>
					</div>
				</div>
			</header>
			<main className='mx-auto max-w-6xl px-6 py-10'>
				<Outlet />
			</main>
		</div>
	);
};
