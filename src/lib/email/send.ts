import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface DispatchEmailPayload {
  to: string;
  patientName: string;
  hospitalName: string;
  otp: string;
  trackingUrl: string;
}

export async function sendDispatchEmail(
  payload: DispatchEmailPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { to, patientName, hospitalName, otp, trackingUrl } = payload;

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to,
      subject: `Your medical delivery is on the way — ${hospitalName}`,
      text: [
        `Hello ${patientName},`,
        "",
        `Your medical delivery from ${hospitalName} has been dispatched.`,
        "",
        `Track your delivery: ${trackingUrl}`,
        "",
        `Your one-time delivery code (share with drone on arrival):`,
        otp,
        "",
        "This code is required to confirm receipt of your delivery.",
        "",
        `— ${hospitalName}`,
      ].join("\n"),
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${hospitalName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Medical Drone Delivery</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;">Hello ${patientName},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
              Your medical delivery from <strong>${hospitalName}</strong> has been dispatched and is on its way.
            </p>

            <!-- OTP block -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f1f5f9;border-radius:8px;padding:20px 24px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">
                    Your Delivery Code
                  </p>
                  <p style="margin:0;font-family:monospace;font-size:40px;font-weight:700;letter-spacing:.15em;color:#1e293b;">
                    ${otp}
                  </p>
                  <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">
                    Share this code with the drone operator on arrival to confirm receipt.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Track button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td align="center">
                  <a href="${trackingUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                    Track Your Delivery →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              If you did not request this delivery, please contact ${hospitalName} immediately.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">${hospitalName} · Autonomous Medical Drone System</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
