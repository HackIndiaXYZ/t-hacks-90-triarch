const authConfig = {
  providers: [
    ...(process.env.CLERK_FRONTEND_API_URL || process.env.CLERK_JWT_ISSUER_DOMAIN
      ? [
          {
            domain:
              process.env.CLERK_FRONTEND_API_URL ||
              process.env.CLERK_JWT_ISSUER_DOMAIN,
            applicationID: "convex",
          },
        ]
      : []),
    {
      domain: "https://clerk.verifi-gray.vercel.app",
      applicationID: "convex",
    },
    {
      domain: "https://verifi-gray.vercel.app",
      applicationID: "convex",
    },
    {
      domain: "https://teaching-alien-9064.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;

