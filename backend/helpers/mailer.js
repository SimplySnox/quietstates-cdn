import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY);

export default async function sendLoginEmail(toEmail, username, ip, device, location) {
    const now = new Date();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">

<style>
    /* Base layout */
    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        background: #ffffff;
        color: #1e1e1e;
    }

    .container {
        max-width: 520px;
        margin: 40px auto;
        padding: 32px;
        border-radius: 12px;
        border: 1px solid #e2e2e2;
        background: #ffffff;
    }

    h2 {
        margin-top: 0;
        color: #2563eb;
        font-weight: 600;
    }

    .box {
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #e2e2e2;
        background: #f7f7f7;
        font-size: 14px;
    }

    strong {
        color: #111;
    }

    /* Dark mode overrides */
    @media (prefers-color-scheme: dark) {
        body {
            background: #0d1117 !important;
            color: #e6edf3 !important;
        }

        .container {
            background: #161b22 !important;
            border-color: #30363d !important;
        }

        h2 {
            color: #58a6ff !important;
        }

        .box {
            background: #0d1117 !important;
            border-color: #30363d !important;
        }

        strong {
            color: #e6edf3 !important;
        }
    }
</style>
</head>
<body>

<div class="container">
    <h2>New Login Detected</h2>

    <p>Hi <strong>${username}</strong>,</p>
    <p>A new login to <strong>QS CDN</strong> was detected.</p>

    <div class="box">
        <p><strong>IP:</strong> ${ip}</p>
        <p><strong>Device:</strong> ${device}</p>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Time:</strong> ${now.toLocaleString()}</p>
    </div>

    <p style="margin-top:18px; opacity: 0.75;">
        If this wasn't you, secure your Discord account immediately.
    </p>

    <p style="margin-top:28px; font-size:12px; opacity: 0.5;">
        — QuietStates System
    </p>
</div>

</body>
</html>
`;

    try {
        const { error } = await resend.emails.send({
            from: "QuietStates <cdn@quietstates.xyz>",
            to: toEmail,
            subject: "New Login Detected",
            html
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