import { useCallback, useEffect, useState } from 'react';

interface UseApiState<T> {
	data: T | null;
	error: Error | null;
	loading: boolean;
}

export function useApi<T>(
	fetcher: () => Promise<T>,
	deps: unknown[] = [],
): UseApiState<T> & { refetch: () => void } {
	const [state, setState] = useState<UseApiState<T>>({
		data: null,
		error: null,
		loading: true,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetcher is intentionally controlled by caller-provided deps
	const execute = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: null }));
		try {
			const data = await fetcher();
			setState({ data, error: null, loading: false });
		} catch (error) {
			setState({ data: null, error: error as Error, loading: false });
		}
	}, deps);

	useEffect(() => {
		execute();
	}, [execute]);

	return { ...state, refetch: execute };
}
