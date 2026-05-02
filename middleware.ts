import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/cases/:path*",
    "/api/workflow/:path*",
    "/api/invitations/:path*",
    "/api/impact",
  ],
};
