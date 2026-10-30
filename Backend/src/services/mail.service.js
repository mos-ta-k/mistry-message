import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";

const getEnv = (name) => process.env[name]?.trim();

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (!domain) return "invalid-address";
  return `${name.slice(0, 1)}***@${domain}`;
};

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="20" fill="#EBE2CC"/>
  <path d="M47 13H17a8 8 0 0 0-8 8v20a8 8 0 0 0 8 8h2v8l11-8h17a8 8 0 0 0 8-8V21a8 8 0 0 0-8-8Z" fill="#287A74"/>
  <path d="M19 27h26M19 35h18" stroke="#fff" stroke-linecap="round" stroke-width="4"/>
</svg>`;

const createTransporter = () => {
  const mailUser = getEnv("MAIL_USER") || getEnv("GMAIL_USER");
  const mailPassword = getEnv("MAIL_PASS");
  const gmailOAuth = {
    clientId: getEnv("GMAIL_CLIENT_ID"),
    clientSecret: getEnv("GMAIL_CLIENT_SECRET"),
    refreshToken: getEnv("GMAIL_REFRESH_TOKEN"),
  };
  const useGmailOAuth = Object.values(gmailOAuth).every(Boolean);

  if (!mailUser || (!mailPassword && !useGmailOAuth)) {
    throw new ApiError(503, "Email delivery is not configured. Please contact support.");
  }

  const mailPort = Number(getEnv("MAIL_PORT")) || 587;
  return {
    mailUser,
    transporter: nodemailer.createTransport({
      host: getEnv("MAIL_HOST") || "smtp.gmail.com",
      port: mailPort,
      secure: mailPort === 465,
      auth: useGmailOAuth
        ? {
            type: "OAuth2",
            user: mailUser,
            ...gmailOAuth,
          }
        : {
            user: mailUser,
            pass: mailPassword,
          },
    }),
  };
};

const getMailErrorDetails = (error) => ({
  code: error.code,
  responseCode: error.responseCode,
  command: error.command,
  message: error.message,
});

const sendWithResend = async ({ apiKey, from, email, subject, text, html }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
      html,
      attachments: [{
        filename: "mistry-logo.svg",
        content: Buffer.from(logoSvg).toString("base64"),
        content_id: "mistry-logo",
      }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || `Resend request failed (${response.status})`);
    error.code = "ERESEND";
    error.responseCode = response.status;
    error.command = "SEND";
    throw error;
  }

  return result;
};

/**
 * Send a 6-digit verification code to a new user.
 */
export const sendVerificationEmail = async (email, username, code) => {
  try {
    const resendApiKey = getEnv("RESEND_API_KEY");
    const mailUser = getEnv("MAIL_USER") || getEnv("GMAIL_USER");
    const from = resendApiKey
      ? getEnv("MAIL_FROM")
      : `"Mistry Message" <${mailUser}>`;

    if (resendApiKey && !from) {
      throw new ApiError(503, "MAIL_FROM must be set when using Resend.");
    }

    const safeUsername = escapeHtml(username);
    const subject = "Your verification code";
    const text = `Hi ${username},\n\nYour verification code is: ${code}\n\nIt expires in 15 minutes.\n\nIf you didn't register, ignore this email.`;
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @media only screen and (max-width: 600px) {
        .mail-shell { padding: 18px 10px !important; }
        .mail-card { width: 100% !important; }
        .mail-content { padding: 30px 22px !important; }
        .mail-code { font-size: 34px !important; letter-spacing: 8px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f3ed;color:#193735;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f3ed;">
      <tr>
        <td align="center" class="mail-shell" style="padding:42px 18px;">
          <table role="presentation" class="mail-card" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border:1px solid #e8e4d8;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="height:8px;background:#287a74;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="mail-content" style="padding:38px 48px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:28px;">
                      <img src="cid:mistry-logo" width="48" height="48" alt="Mistry Message" style="display:block;width:48px;height:48px;border:0;">
                      <div style="padding-top:10px;color:#287a74;font-size:13px;font-weight:bold;letter-spacing:.3px;">Mistry Message</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <div style="display:inline-block;padding:6px 11px;border-radius:20px;background:#edf5f1;color:#287a74;font-size:10px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;">A note for your inbox</div>
                      <h1 style="margin:17px 0 10px;color:#193735;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;line-height:1.2;">A little confirmation</h1>
                      <p style="margin:0;color:#62736e;font-size:14px;line-height:1.75;">Hello ${safeUsername},<br>Use this code to verify your email and open your personal message inbox.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:26px 0 18px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border:1px dashed #c9d9cf;border-radius:14px;background:#f8faf6;">
                        <tr>
                          <td class="mail-code" style="padding:18px 26px;color:#086288;font-family:'Courier New',monospace;font-size:38px;font-weight:bold;letter-spacing:10px;">${code}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p style="margin:0;color:#71817c;font-size:12px;line-height:1.7;">This code expires in <strong style="color:#287a74;">15 minutes</strong>.<br>If you didn’t request it, you can safely ignore this note.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:30px;">
                      <div style="height:1px;background:#eeeae0;"></div>
                      <p style="margin:18px 0 0;color:#9aa59f;font-family:Georgia,'Times New Roman',serif;font-size:12px;font-style:italic;text-align:center;">Sent with care, from Mistry Message</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#89958f;font-size:10px;line-height:1.6;text-align:center;">Please don’t share this verification code with anyone.</p>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
    let messageId;
    let provider;

    if (resendApiKey) {
      const result = await sendWithResend({
        apiKey: resendApiKey,
        from,
        email,
        subject,
        text,
        html,
      });
      messageId = result.id;
      provider = "Resend";
    } else {
      const { mailUser, transporter } = createTransporter();
      const result = await transporter.sendMail({
        from: `"Mistry Message" <${mailUser}>`,
        to: email,
        subject,
        text,
        html,
        attachments: [{
          filename: "mistry-logo.svg",
          content: logoSvg,
          contentType: "image/svg+xml",
          cid: "mistry-logo",
        }],
      });

      if (!result.accepted.some((recipient) => recipient.toLowerCase() === email.toLowerCase())) {
        throw new Error("SMTP did not accept the verification email recipient");
      }

      messageId = result.messageId;
      provider = "SMTP";
    }

    console.info(
      `Verification email accepted by ${provider} for ${maskEmail(email)} (message ID: ${messageId})`
    );
  } catch (error) {
    console.error(
      `Verification email delivery failed for ${maskEmail(email)}:`,
      getMailErrorDetails(error)
    );
    throw new ApiError(503, "Could not send the verification email. Please try again later.");
  }
};
