import { Outlet } from 'react-router';

export function RootLayout() {
	return (
		<div>
			<nav>{/* Navigation will be added with UI library */}</nav>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
