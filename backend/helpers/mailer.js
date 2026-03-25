import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send login notification email
 */
export default async function sendLoginEmail(toEmail, username, ip, device, location) {
    const html = `
        <div style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6edf3;">
            <div style="max-width:520px;margin:40px auto;padding:32px;background:#161b22;border-radius:12px;border:1px solid #30363d;">
                
                <h2 style="margin-top:0;color:#58a6ff;font-weight:600;">
                    New Login Detected
                </h2>

                <p style="margin:16px 0;font-size:14px;">
                    Hi <strong>${username}</strong>,
                </p>

                <p style="margin:16px 0;font-size:14px;color:#c9d1d9;">
                    A new login to <strong>QS CDN</strong> was detected on your account.
                </p>

                <div style="margin:20px 0;padding:14px;background:#0d1117;border:1px solid #30363d;border-radius:8px;font-size:13px;">
                    <p style="margin:6px 0;color:#8b949e;">
                        <strong style="color:#e6edf3;">IP Address:</strong> ${ip}
                    </p>
                    <p style="margin:6px 0;color:#8b949e;">
                        <strong style="color:#e6edf3;">Device:</strong> ${device}
                    </p>
                    <p style="margin:6px 0;color:#8b949e;">
                        <strong style="color:#e6edf3;">Location:</strong> ${location}
                    </p>
                    <p style="margin:6px 0;color:#8b949e;">
                        <strong style="color:#e6edf3;">Time:</strong> ${new Date().toLocaleString()}
                    </p>
                </div>

                <div style="margin:20px 0;padding:12px 16px;background:#0d1117;border:1px solid #30363d;border-radius:8px;font-size:13px;color:#8b949e;">
                    If this wasn’t you, please secure your Discord account immediately.
                </div>

                <p style="margin-top:28px;font-size:12px;color:#6e7681;">
                    — QuietStates System
                </p>

            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: toEmail,
            subject: "New Login Detected",
            html
        });

        console.log(`Login email sent → ${toEmail}`);
    } catch (err) {
        console.error("Email error:", err);
    }
}