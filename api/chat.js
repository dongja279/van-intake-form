// api/chat.js  (Vercel Serverless)
// 환경변수: OPENAI_API_KEY
const ALLOWED_ORIGIN = "*";

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }
    const { messages = [] } = req.body || {};
    const system = {
      role: "system",
      content: "너는 VAN/포스 전환 전문 상담원이다. 답변은 간단명료. 개인정보는 폼으로만 유도."
    };
    const redact = (s="") =>
      s.replace(/\d{3}-?\d{2}-?\d{5}/g,"[사업자번호]")
       .replace(/\d{2,4}-?\d{3,4}-?\d{4}/g,"[전화번호]");

    const safe = [system, ...messages.map(m=>({role:m.role, content:redact(String(m.content||""))}))];

    const r = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:"gpt-4o-mini",temperature:0.3,messages:safe})
    });
    if(!r.ok){
      const t = await r.text();
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(r.status).json({ error: t });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "";
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.status(200).json({ reply });
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.status(500).json({ error: String(e) });
  }
};
