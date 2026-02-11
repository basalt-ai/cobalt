import { Outlet } from 'react-router';
import { TopBar } from '../components/layout/top-bar';
import { TooltipProvider } from '../components/ui/tooltip';

export function RootLayout() {
	return (
		<TooltipProvider delayDuration={300}>
			<div className="min-h-screen bg-background text-foreground">
				<TopBar />
				<main className="mx-auto max-w-7xl px-6 py-6">
					<Outlet />
				</main>
			</div>
		</TooltipProvider>
	);
}
