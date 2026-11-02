import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 jam

async function authorizeEmail(email: string) {
  const backendUrl =
    process.env.BACKEND_URL ||
    "http://backend:8000";

  try {
    const response = await fetch(
      `${backendUrl}/api/auth/authorize?email=${encodeURIComponent(email)}`,
      {
        headers: {
          "X-Internal-Key":
            process.env.INTERNAL_API_KEY || "",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Authorization API error:",
        response.status
      );

      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(
      "Authorization API unavailable:",
      error
    );

    return null;
  }
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,

  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID!,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60, // 1 jam
  },

  jwt: {
    maxAge: SESSION_MAX_AGE,
  },

  callbacks: {
    async signIn({ user, account }) {
      if (
        account?.provider !== "google"
      ) {
        return false;
      }

      if (!user.email) {
        return false;
      }

      const email = user.email.trim().toLowerCase();
      const authorization = await authorizeEmail(email);

      if (!authorization?.allowed) {
        console.warn(
          `Login rejected: ${email}`
        );
        return false;
      }

      // simpan sementara untuk callback JWT
      (user as any).role =
        authorization.role;

      return true;
    },

    async jwt({
      token,
      user,
    }) {
      if (user) {
        token.role =
          (user as any).role ||
          "user";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role =
          token.role || "user";
      }
      return session;
    },
  },
});