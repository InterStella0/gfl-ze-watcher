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
                hostname: '127.0.0.1',
            },
            {
                hostname: '::1',
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
            },
            {
                protocol: 'https',
                hostname: 'bans.gflclan.com',
            }
        ]
    }
};

export default nextConfig;