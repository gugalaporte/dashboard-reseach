/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.office.com https://*.microsoft365.com https://outlook.office.com https://outlook.office365.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
