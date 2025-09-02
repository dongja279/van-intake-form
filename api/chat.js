// api/chat.js
// Vercel Serverless Function (Node.js)
// 의존성 없음. OpenAI REST 직접 호출.

const ALLOWED_ORIGIN = "*"; // 필요시 도메인으로 제한

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

    // 시스템 프롬프트: VAN/POS 전문 상담원 정책
    const system = {
      role: "system",
      content: [
        "너는 VAN/포스 전환 전문 상담원이다.",
        "답변은 요약 위주, 불릿 포인트 선호.",
        "개인정보(전화번호, 사업자번호)는 수집하지 말고 폼 제출로 유도.",
        "불확실하면 추가 질문 1~2개만.",
        "톤은 중립적이고 간단명료."
      ].join(" ")
    };

    // 민감 숫자 가림
    const redact = (s = "") =>
      s
        .replace(/\d{3}-?\d{2}-?\d{5}/g, "[사업자번호]")
        .replace(/\d{2,4}-?\d{3,4}-?\d{4}/g, "[전화번호]");

    const safeMessages = [
      system,
      ...messages.map(m => ({ role: m.role, content: redact(String(m.content || "")) }))
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: safeMessages
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      return res.status(resp.status).json({ error: txt });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "";

    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.status(200).json({ reply });
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.status(500).json({ error: String(err) });
  }
};
