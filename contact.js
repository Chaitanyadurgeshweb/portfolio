// Vercel serverless function: POST /api/contact
const clean = (v, max) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });

  const { RESEND_API_KEY, MAIL_TO, MAIL_FROM = "Portfolio Contact <onboarding@resend.dev>" } = process.env;
  if (!RESEND_API_KEY || !MAIL_TO) return res.status(500).json({ ok: false, error: "Server not configured." });

  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot

  const name = clean(b.name, 100);
  const email = clean(b.email, 150);
  const subject = clean(b.subject, 150);
  const message = String(b.message ?? "").trim().slice(0, 5000);

  if (name.length < 2 || subject.length < 3 || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid input." });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        reply_to: email,
        subject: `[Portfolio] ${subject}`,
        text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
        html: `<p><b>From:</b> ${esc(name)} &lt;${esc(email)}&gt;</p>
               <p><b>Subject:</b> ${esc(subject)}</p>
               <hr><p style="white-space:pre-wrap">${esc(message)}</p>`,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Mail error:", err.message);
    res.status(500).json({ ok: false, error: "Could not send message." });
  }
};
