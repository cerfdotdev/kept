import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db, schema } from "./db";
import { sendOtpEmail, storeDemoOtp } from "./email";

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-in-prod",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      rateLimit: schema.rateLimits,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // daily refresh
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  emailAndPassword: { enabled: false },
  rateLimit: {
    window: 60,
    max: 30,
    storage: "database",
    modelName: "rateLimit",
    customRules: { "/sign-in/email-otp": { window: 60, max: 5 } },
    advanced: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      trustedProxies: ["::1", "127.0.0.1", "::ffff:127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
    },
  },
  advanced: {
    cookiePrefix: "kept",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        const demoMode = process.env.DEMO_MODE === "true";
        if (demoMode) await storeDemoOtp(email, otp);
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
