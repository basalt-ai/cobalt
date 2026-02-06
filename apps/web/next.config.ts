import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	transpilePackages: ['@cobalt/db', '@cobalt/types'],
	typescript: {
		ignoreBuildErrors: false,
	},
	eslint: {
		ignoreDuringBuilds: true, // Using Biome instead
	},
};

export default nextConfig;
