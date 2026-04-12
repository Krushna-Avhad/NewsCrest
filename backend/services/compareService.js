// backend/services/compareService.js
// Owns the entire compare feature — uses Groq (GROK_API_KEY) for AI analysis
import Groq from "groq-sdk";

// ── Groq client (your friend's key) ──────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROK_API_KEY });

// ── Groq caller ───────────────────────────────────────────────────────────────
async function callGrok(systemPrompt, userPrompt) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0]?.message?.content?.trim() || "";
}

// ── JSON parser ───────────────────────────────────────────────────────────────
function parseCompareJSON(text) {
  try {
    const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found");
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("Compare JSON parse error:", err.message);
    return null;
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function mockCompare(item1, item2) {
  const t1 = (item1.title || "Article 1").slice(0, 50);
  const t2 = (item2.title || "Article 2").slice(0, 50);
  return {
    similarities: [
      {
        aspect: "Public Relevance",
        description: "Both articles address issues of significant public interest.",
        confidence: 0.75,
      },
      {
        aspect: "News Category",
        description: "Both stories fall within the same broad news domain.",
        confidence: 0.7,
      },
    ],
    differences: [
      {
        aspect: "Topic Focus",
        description: `"${t1}" covers a distinct angle compared to "${t2}".`,
        confidence: 0.8,
      },
      {
        aspect: "Geographical Scope",
        description: "The two articles differ in the regions and communities they address.",
        confidence: 0.7,
      },
    ],
    insights: [
      {
        type: "key_takeaway",
        content: "Reading both articles together offers a fuller picture of the broader news landscape.",
        importance: "high",
      },
      {
        type: "key_takeaway",
        content: "Each article highlights a different dimension of public affairs worth following.",
        importance: "medium",
      },
    ],
    overallScore: 0.55,
    sentiment: {
      item1: "neutral",
      item2: "neutral",
      comparison: "Both articles maintain a balanced and neutral tone in their reporting.",
    },
    socialImpact: {
      item1: {
        level: "medium",
        areas: ["Public Awareness", "Policy"],
        summary: "Likely to inform public debate and policy discussion.",
      },
      item2: {
        level: "medium",
        areas: ["Community", "Society"],
        summary: "Expected to influence community awareness and civic discourse.",
      },
      overall: "Both stories carry medium social impact and contribute to informed public discourse.",
    },
  };
}

// ── Main export — used by compareController.js ────────────────────────────────
export const compareNews = async (item1, item2) => {
  const prompt = `Compare these two news articles. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Required JSON structure:
{
  "similarities": [{ "aspect": "string", "description": "string", "confidence": 0.8 }],
  "differences":  [{ "aspect": "string", "description": "string", "confidence": 0.8 }],
  "insights":     [{ "type": "key_takeaway", "content": "string", "importance": "high" }],
  "overallScore": 0.65,
  "sentiment": {
    "item1": "positive|negative|neutral|mixed",
    "item2": "positive|negative|neutral|mixed",
    "comparison": "one sentence comparing the tone of both articles"
  },
  "socialImpact": {
    "item1": { "level": "high|medium|low", "areas": ["area1"], "summary": "one sentence" },
    "item2": { "level": "high|medium|low", "areas": ["area1"], "summary": "one sentence" },
    "overall": "one sentence comparing overall social impact"
  }
}

Article 1:
Title: ${item1.title}
Content: ${(item1.content || item1.summary || "").slice(0, 600)}

Article 2:
Title: ${item2.title}
Content: ${(item2.content || item2.summary || "").slice(0, 600)}`;

  try {
    console.log("🔄 [Compare] Calling Groq with GROK_API_KEY:", process.env.GROK_API_KEY?.slice(0, 10) + "...");
    const text = await callGrok(
      "You are a precise JSON-only news comparison AI. Never include markdown or explanation.",
      prompt
    );
    console.log("✅ [Compare] Groq raw response:", text?.slice(0, 300));

    const parsed = parseCompareJSON(text);
     console.log("🔍 [Compare] Parsed:", parsed ? "valid JSON" : "NULL — falling to mock");

    if (
      !parsed ||
      (!Array.isArray(parsed.similarities) && !Array.isArray(parsed.differences))
    ) {
      throw new Error("Groq returned invalid structure");
    }

    // Sanitize importance values
    const VALID_IMPORTANCE = ["low", "medium", "high"];
    if (Array.isArray(parsed.insights)) {
      parsed.insights = parsed.insights.map((i) => ({
        ...i,
        importance: VALID_IMPORTANCE.includes(i?.importance)
          ? i.importance
          : "medium",
      }));
    }

    return parsed;
  } catch (err) {
    console.warn("compareNews Groq failed, using mock:", err.message);
    return mockCompare(item1, item2);
  }
};
