const authConfig = {
  providers: [
    {
      domain:
        process.env.CLERK_FRONTEND_API_URL ||
        process.env.CLERK_JWT_ISSUER_DOMAIN ||
        "https://teaching-alien-9064.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;

