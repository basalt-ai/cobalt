import { useSearchParams } from 'react-router';

export function TrendsPage() {
	const [searchParams] = useSearchParams();
	const experiment = searchParams.get('experiment');
	return <div>Trends: {experiment}</div>;
}
