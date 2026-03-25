import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY);

export default async function sendLoginEmail(toEmail, username, ip, device, location) {
    try {
        const { data, error } = await resend.emails.send({
            from: "QuietStates <cdn@quietstates.xyz>",
            to: toEmail,
            subject: "New Login Detected",
            html: `
                <div style="background:#0d1117;color:#e6edf3;padding:32px;border-radius:8px;font-family:Arial, sans-serif;">
                    <h2 style="color:#58a6ff;">New Login Detected</h2>
                    <p>Hi <strong>${username}</strong>,</p>
                    <p>A new login to <strong>QS CDN</strong> was detected.</p>

                    <div style="background:#161b22;padding:16px;border-radius:8px;margin:16px 0;">
                        <p><strong>IP:</strong> ${ip}</p>
                        <p><strong>Device:</strong> ${device}</p>
                        <p><strong>Location:</strong> ${location}</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <p style="color:#8b949e;">If this wasn't you, secure your Discord account.</p>
                    <p style="margin-top:20px;color:#6e7681;">— QuietStates System</p>
                </div>
            `
        });

        if (error) {
            console.error("Resend Email Error:", error);
        } else {
            console.log(`Email sent to ${toEmail}`);
        }
    } catch (err) {
        console.error("Fatal email error:", err);
    }
}