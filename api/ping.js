export default function handler(req, res) {
  const allowedOrigins = [
    "https://website-ai-nine-olive.vercel.app",
    "https://website-ai-git-main-znaflas-projects.vercel.app",
    "https://website-nqeakfr0f-znaflas-projects.vercel.app"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  res.status(200).json({ ok: true, origin });
}
