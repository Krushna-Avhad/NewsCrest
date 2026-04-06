// services/perspectiveService.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROK_API_KEY });

// Canonical persona definitions — used for label lookup only
const PERSONAS = [
  { id: "student",     label: "Student"         },
  { id: "investor",    label: "Investor"        },
  { id: "politician",  label: "Politician"      },
  { id: "citizen",     label: "Common Citizen"  },
  { id: "it_employee", label: "IT Employee"     },
  { id: "business",    label: "Business Person" },
  { id: "homemaker",   label: "Homemaker"       },
];

const PERSONA_LABEL_MAP = Object.fromEntries(PERSONAS.map(p => [p.id, p.label]));

function buildPrompt(title, description, category) {
  return `You are a sharp, context-aware news analyst. Your task is to analyze a news article and explain how it specifically impacts different groups of people.

ARTICLE:
Title: "${title}"
Summary: "${(description || "").slice(0, 800)}"
Category: "${category || "General"}"

TASK:
For each of the 7 persona types below, decide if this article genuinely and directly affects them.
- If YES: write 2 concise, specific sentences explaining the real-world impact on that persona. Be concrete — reference actual details from this article (prices, policies, technologies, events). Do NOT write generic statements.
- If NO or only vaguely relevant: set to null.

PERSONAS:
- student: School or university students (academic schedules, career prospects, skills, tuition costs)
- investor: People with stocks, mutual funds, crypto, or other investments (market movement, returns, risk)
- politician: Elected officials, government workers, party members (policy, public opinion, governance)
- citizen: Average person in everyday life (costs of living, safety, rights, public services)
- it_employee: Software engineers, IT professionals, tech workers (tools, jobs, industry shifts)
- business: Business owners, managers, corporate executives (revenue, operations, regulations, costs)
- homemaker: People managing a household (grocery prices, utilities, home loans, family health)

RULES:
- Only include personas with a DIRECT, CLEAR connection to this specific article
- Do NOT include a persona just because the topic broadly affects everyone
- Responses must reflect THIS article's actual content, not generic knowledge
- Aim for 2-5 relevant personas per article, not all 7

Respond ONLY with a valid JSON object. No markdown, no extra text:
{
  "student": "2 specific sentences about impact, or null",
  "investor": "2 specific sentences about impact, or null",
  "politician": "2 specific sentences about impact, or null",
  "citizen": "2 specific sentences about impact, or null",
  "it_employee": "2 specific sentences about impact, or null",
  "business": "2 specific sentences about impact, or null",
  "homemaker": "2 specific sentences about impact, or null"
}`;
}

export async function generatePerspectives(title, description, category) {
  if (!title?.trim()) return [];

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: buildPrompt(title, description, category) }],
      max_tokens: 800,
      temperature: 0.4,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in AI response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Build result array — only include non-null, non-empty values
    const results = [];
    for (const persona of PERSONAS) {
      const val = parsed[persona.id];
      if (
        val &&
        typeof val === "string" &&
        val.trim().length > 10 &&
        val.trim().toLowerCase() !== "null"
      ) {
        results.push({
          id:    persona.id,
          label: persona.label,
          text:  val.trim(),
        });
      }
    }

    if (results.length === 0) throw new Error("AI returned no valid perspectives");
    return results;

  } catch (err) {
    console.error("perspectiveService error:", err.message);
    // Return empty — let the frontend show "no perspectives" cleanly
    return [];
  }
}
