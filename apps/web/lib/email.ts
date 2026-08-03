import "server-only";
import { db, schema } from "./db";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email:console] to=${payload.to} subject="${payload.subject}"\n${payload.html}`);
  }
}

class ResendProvider implements EmailProvider {
  private key: string;
  private from: string;

  constructor() {
    this.key = process.env.RESEND_API_KEY ?? "";
    this.from = process.env.RESEND_FROM ?? "Kept by Ledgerfolk <hello@kept.dok.cerf.codes>";
  }

  async send(payload: EmailPayload): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to: payload.to, subject: payload.subject, html: payload.html }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`resend error ${res.status}: ${body.slice(0, 300)}`);
    }
  }
}

function provider(): EmailProvider {
  const mode = process.env.EMAIL_PROVIDER ?? (process.env.RESEND_API_KEY ? "resend" : "console");
  return mode === "resend" ? new ResendProvider() : new ConsoleProvider();
}

export async function sendOtpEmail(email: string, otp: string, type: string): Promise<void> {
  const subject =
    type === "sign-in"
      ? "Your sign-in code"
      : type === "email-verification"
        ? "Verify your email"
        : type === "password-reset"
          ? "Reset your password"
          : "Your code";
  await provider().send({
    to: email,
    subject,
    html: `
      <div style="font-family:Georgia,serif;background:#F7F3EA;padding:32px;color:#1E4D43">
        <h1 style="font-size:20px;margin:0 0 16px">Your sign-in code</h1>
        <p style="font-size:16px;line-height:1.6">Use this code to sign in to Kept. It expires in 5 minutes.</p>
        <div style="font-family:monospace;font-size:32px;letter-spacing:8px;background:#fff;border:1px solid #1E4D43;display:inline-block;padding:12px 24px;margin:16px 0">${otp}</div>
        <p style="font-size:13px;color:#5a7a70">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  });
}

export async function storeDemoOtp(email: string, otp: string): Promise<void> {
  await db.insert(schema.demoOtps).values({ email: email.toLowerCase(), code: otp });
}
