import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Cobalt',
	description: 'A TypeScript full-stack application',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
