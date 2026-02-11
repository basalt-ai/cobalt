import { createBrowserRouter } from 'react-router';
import { RootLayout } from './layouts/root-layout';
import { ComparePage } from './pages/compare';
import { NotFoundPage } from './pages/not-found';
import { RunDetailPage } from './pages/run-detail';
import { RunsListPage } from './pages/runs-list';
import { TrendsPage } from './pages/trends';

export const router = createBrowserRouter([
	{
		element: <RootLayout />,
		children: [
			{ path: '/', element: <RunsListPage /> },
			{ path: '/runs/:id', element: <RunDetailPage /> },
			{ path: '/compare', element: <ComparePage /> },
			{ path: '/trends', element: <TrendsPage /> },
			{ path: '*', element: <NotFoundPage /> },
		],
	},
]);
