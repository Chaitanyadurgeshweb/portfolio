// Vercel serverless function: POST /api/contact
// Required environment variables:
//   RESEND_API_KEY - Resend API key (keep server-side only)
//   MAIL_TO        - destination inbox (Gmail is fine)
// Optional:
//   CONTACT_EMAIL  - supported as a fallback for older Vercel configuration

const FROM_EMAIL = "Chaitanya Durgesh <hello@chaitanyadurgesh.in>";

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(payload));
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.MAIL_TO || process.env.CONTACT_EMAIL;

  if (!apiKey || !recipient) {
    console.error("Contact form configuration missing: RESEND_API_KEY or MAIL_TO/CONTACT_EMAIL.");
    return sendJson(res, 500, { error: "Email service is not configured." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON request." });
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(res, 400, { error: "Invalid request body." });
  }

  // Silently accept honeypot submissions without sending email.
  if (clean(body.website, 200)) {
    return sendJson(res, 200, { success: true });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 254);
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 8000);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      subject.length < 3 || message.length < 10) {
    return sendJson(res, 400, { error: "Please provide valid contact form details." });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        reply_to: email,
        subject: `Portfolio contact: ${subject}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Subject: ${subject}`,
          "",
          message,
        ].join("\n"),
        html: `
          <h2>New portfolio contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong><br>${safeMessage}</p>
        `,
      }),
    });

    const result = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error("Resend API rejected contact email:", resendResponse.status, result);
      return sendJson(res, 502, { error: "Email provider could not send the message." });
    }

    return sendJson(res, 200, { success: true, id: result.id });
  } catch (error) {
    console.error("Contact email request failed:", error);
    return sendJson(res, 502, { error: "Unable to contact the email provider." });
  }
};
