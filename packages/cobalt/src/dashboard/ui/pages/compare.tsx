import { useSearchParams } from 'react-router';

export function ComparePage() {
	const [searchParams] = useSearchParams();
	const a = searchParams.get('a');
	const b = searchParams.get('b');
	return (
		<div>
			Compare: {a} vs {b}
		</div>
	);
}
