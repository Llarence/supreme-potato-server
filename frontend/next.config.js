const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:2521/:path*'
            }
        ]
    }
}

module.exports = nextConfig
