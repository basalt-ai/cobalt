import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === 'undefined') return 'light';
		const stored = localStorage.getItem('cobalt-theme');
		if (stored === 'dark' || stored === 'light') return stored;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	});

	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(theme);
		localStorage.setItem('cobalt-theme', theme);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
	}, []);

	return { theme, toggleTheme };
}
