import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	plugins: [tailwindcss(), react()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:4000',
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: resolve(__dirname, '../../../dist/dashboard'),
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks: {
					recharts: ['recharts'],
					radix: [
						'@radix-ui/react-dialog',
						'@radix-ui/react-select',
						'@radix-ui/react-tabs',
						'@radix-ui/react-tooltip',
					],
				},
			},
		},
	},
});
