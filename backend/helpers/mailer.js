import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_KEY);

export default async function sendLoginEmail(toEmail, username) {
    try {
        await resend.emails.send({
            from: "Snox <no-reply@simplysnox.com>",
            to: [toEmail ],
            subject: "CDN Authentication Successful",
            html: `
                <div style="font-family:Arial;font-size:15px;">
                    <h2>🎉 Authentication Successful</h2>
                    <p>Hey <b>${username}</b>,</p>
                    <p>You successfully authenticated with the <b>QS CDN / SimplySnox CDN</b>.</p>
                    
                    <p>If this wasn't you, please reset your Discord password.</p>

                    <br>
                    <p>— QS CDN System</p>
                </div>
            `
        });

        console.log(`Sent login email to ${toEmail}`);
    } catch (err) {
        console.error("Email error:", err);
    }
}
