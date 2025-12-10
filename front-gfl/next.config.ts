import  { NextConfig } from 'next';

const nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    logging: {
        fetches: {
            fullUrl: true
        }
    },
    images: {
        remotePatterns: [
            {
                hostname: 'localhost:3000',
            },
            {
                hostname: 'localhost',
            },
            {
                hostname: '127.0.0.1:3000',
            },
            {
                protocol: 'https',
                hostname: 'zegraph.xyz'
            },
            {
                protocol: 'https',
                hostname: 'avatars.steamstatic.com',
            },
            {
                protocol: 'https',
                hostname: 'flagcdn.com',
            }
        ]
    }
};

export default nextConfig;