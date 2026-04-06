// services/perspectiveService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── All 9 personas ─────────────────────────────────────────────────────────
export const PERSONAS = [
  { id: "student",      label: "Student",        emoji: "🎓" },
  { id: "investor",     label: "Investor",        emoji: "📈" },
  { id: "politician",   label: "Politician",      emoji: "🏛️" },
  { id: "citizen",      label: "Common Citizen",  emoji: "🏘️" },
  { id: "it_employee",  label: "IT Employee",     emoji: "💻" },
  { id: "business",     label: "Business Person", emoji: "💼" },
  { id: "homemaker",    label: "Homemaker",       emoji: "🏠" },
  { id: "job_seeker",   label: "Job Seeker",      emoji: "🔍" },
  { id: "entrepreneur", label: "Entrepreneur",    emoji: "🚀" },
];

const PERSONA_IDS = PERSONAS.map(p => p.id);

// ── Gemini prompt — asks AI to SKIP irrelevant personas ───────────────────
function buildPrompt(title, description, category) {
  return `You are a news relevance analyst. Given the news article below, decide which types of people are GENUINELY and DIRECTLY affected by it.

Rules:
- ONLY include a person type if this specific news truly and directly affects them
- DO NOT include a person type for vague or indirect connections
- Each included response must be 1-2 sentences, practical, and specific to THIS article
- If a person type is NOT affected, set their value to null
- Be strict — it is better to return fewer relevant perspectives than many generic ones

Article Title: "${title}"
Description: "${(description || "").slice(0, 600)}"
Category: "${category || "General"}"

Person types to evaluate:
- student: university/school students
- investor: stock/mutual fund/crypto investors
- politician: elected officials or political workers
- citizen: average person in daily life
- it_employee: software engineers, IT professionals
- business: business owners, managers, executives
- homemaker: people managing a household
- job_seeker: people actively looking for jobs
- entrepreneur: startup founders, new business creators

Respond ONLY in valid JSON. Use null for irrelevant personas:
{
  "student": "specific insight or null",
  "investor": "specific insight or null",
  "politician": "specific insight or null",
  "citizen": "specific insight or null",
  "it_employee": "specific insight or null",
  "business": "specific insight or null",
  "homemaker": "specific insight or null",
  "job_seeker": "specific insight or null",
  "entrepreneur": "specific insight or null"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-BASED RELEVANCE — used as fallback when Gemini is unavailable
// Each topic maps ONLY the personas that genuinely care about it.
// All others are omitted (not filled with generic text).
// ─────────────────────────────────────────────────────────────────────────────

// Returns { personaId: "insight text" } — only for relevant personas
function buildFallback(title, category) {
  const t = title.toLowerCase();
  const c = (category || "").toLowerCase();

  const isTech      = /tech|ai|software|app|internet|cyber|digital|device|robot|algorithm|platform/.test(t) || c === "technology";
  const isFinance   = /market|stock|share|sensex|nifty|tax|budget|economy|inflation|rate|rupee|bank|finance|mutual fund|crypto|gdp/.test(t) || c === "finance";
  const isJob       = /job|employ|hire|hiring|layoff|salary|work|career|recruitment|workforce/.test(t);
  const isPolicy    = /policy|government|law|scheme|bill|parliament|rule|regulation|minister|cabinet|supreme court/.test(t) || c === "politics";
  const isHealth    = /health|disease|hospital|vaccine|medicine|drug|virus|epidemic|pandemic|cancer|mental health/.test(t) || c === "health";
  const isEducation = /education|school|college|exam|university|syllabus|admission|board|neet|jee|upsc/.test(t) || c === "education";
  const isStartup   = /startup|funding|series|venture|unicorn|valuation|pitch|incubator/.test(t);
  const isRealEstate= /property|real estate|housing|rent|home loan|construction|flat|apartment/.test(t);
  const isCommodity = /petrol|diesel|fuel|oil|gas|food|vegetable|onion|tomato|price|grocery/.test(t);
  const isElection  = /election|vote|poll|candidate|party|campaign|constituency/.test(t);
  const isCrime     = /crime|arrest|murder|theft|fraud|scam|court|verdict|accused/.test(t);
  const isSport     = /cricket|football|ipl|cwg|olympic|match|tournament|player|team|league/.test(t) || c === "sports";
  const isEnv       = /climate|environment|pollution|flood|drought|earthquake|disaster|forest|wildlife/.test(t);

  // Build map of only relevant perspectives per topic
  if (isFinance) return {
    investor:     "Stock, bond, or mutual fund portfolios are directly affected — review your positions based on this development.",
    business:     "Operating costs, credit availability, or revenue projections may shift — reassess your financial plan.",
    entrepreneur: "Funding environment and consumer spending power are impacted — adjust your growth strategy accordingly.",
    citizen:      "EMIs, savings account returns, or everyday prices may change depending on how this unfolds.",
    homemaker:    "Household expenses like groceries, fuel, or loan repayments could be affected by this change.",
  };

  if (isJob) return {
    job_seeker:   "The hiring landscape in affected sectors is directly changing — align your applications and skills now.",
    student:      "The job market you'll graduate into is shifting — this is worth tracking for career planning.",
    it_employee:  "Workforce trends in your industry are moving — stay updated on how this affects your role or team.",
    business:     "Talent costs and workforce availability in your sector may change as a result.",
    entrepreneur: "Hiring budgets and available talent for your startup will be impacted — plan your team accordingly.",
    citizen:      "If you or someone in your household works in the affected sector, income stability may be at stake.",
  };

  if (isTech) return {
    it_employee:  "This development is directly in your domain — upskilling or adapting workflows may be necessary.",
    entrepreneur: "There's a potential product or service gap here — evaluate whether this is an opportunity to build.",
    student:      "This tech shift may open new career paths or change the skills employers will ask for.",
    investor:     "Related tech stocks or sectors may see valuation movement — monitor the market closely.",
    business:     "Evaluate whether adopting this technology can reduce costs or improve your operations.",
  };

  if (isPolicy) return {
    citizen:      "This policy directly affects your rights, access to public services, or daily interactions with the government.",
    politician:   "This decision will shape public opinion and may require you to take or defend a clear position.",
    business:     "Compliance requirements or tax changes linked to this policy require immediate attention.",
    entrepreneur: "New regulations or approvals tied to this policy will affect your business environment.",
    homemaker:    "Any subsidies, schemes, or changes to public services mentioned here may benefit your household.",
  };

  if (isHealth) return {
    citizen:      "Follow the recommended health precautions to protect yourself and your immediate family.",
    homemaker:    "Family health and household medical decisions are directly relevant to this development.",
    investor:     "Pharma, insurance, and hospital stocks may move on this — watch the healthcare sector.",
    job_seeker:   "Demand for healthcare and support roles may spike or change depending on the situation.",
    entrepreneur: "A service gap or health-tech opportunity may emerge from this development.",
  };

  if (isEducation) return {
    student:      "Your exams, admissions, fees, or academic calendar may be directly affected by this.",
    homemaker:    "School schedules, tuition costs, or admission processes for your children may change.",
    job_seeker:   "Required qualifications or certification standards in your target field may be updated.",
    entrepreneur: "Gaps in educational access or quality often create strong EdTech business opportunities.",
    investor:     "Listed EdTech companies and private institutions may see valuation changes from this.",
  };

  if (isStartup) return {
    entrepreneur: "Funding conditions, valuation benchmarks, or investor sentiment in your sector are shifting.",
    investor:     "This signals movement in the startup ecosystem — early or growth-stage opportunities may be opening.",
    it_employee:  "If you're considering a move to a startup, this news affects the risk and reward picture.",
    job_seeker:   "Funded startups typically hire quickly — this development may create new openings in the sector.",
  };

  if (isRealEstate) return {
    citizen:      "If you're planning to buy, sell, or rent a home, this development is directly relevant.",
    homemaker:    "Home loan rates, property values, or rental costs in your area may be affected.",
    investor:     "Real estate as an asset class is directly impacted — review your property portfolio.",
    business:     "Office space costs, commercial lease terms, or expansion plans may be influenced.",
    entrepreneur: "Your startup's office or operational space costs may change as a result.",
  };

  if (isCommodity) return {
    homemaker:    "Grocery, fuel, or essential item prices that affect your daily budget are directly involved.",
    citizen:      "Your monthly household expenses will likely feel the impact of this price movement.",
    business:     "Input costs and supply chain expenses tied to these commodities need to be reassessed.",
    entrepreneur: "If your product depends on these inputs, your cost structure and pricing may need updating.",
    investor:     "Commodity-linked stocks and funds may see movement — monitor related sectors closely.",
  };

  if (isElection) return {
    citizen:      "Your vote and civic participation are directly connected to the outcome of this event.",
    politician:   "This election development is central to your campaign, coalition, or governance strategy.",
    business:     "Policy direction after the election will affect business regulations, taxes, and market conditions.",
    investor:     "Political outcomes typically move markets — sector-specific impacts are likely.",
  };

  if (isCrime) return {
    citizen:      "Public safety and trust in institutions are directly relevant to this case.",
    politician:   "This case may draw public scrutiny and require a formal response or statement.",
  };

  if (isSport) return {
    citizen:      "If you follow this sport, the results and developments here directly impact the season narrative.",
    investor:     "Broadcast rights, sponsorship deals, and listed sports companies may be affected.",
    entrepreneur: "Fan engagement, sports-tech, or merchandise opportunities may be tied to this event.",
  };

  if (isEnv) return {
    citizen:      "Your local environment, health, or access to natural resources may be affected.",
    homemaker:    "Household decisions around water usage, energy, or local conditions are relevant here.",
    politician:   "Environmental issues carry strong public opinion weight — a policy stance may be needed.",
    entrepreneur: "CleanTech, sustainability, or crisis-response products may find opportunity in this development.",
    investor:     "ESG-focused portfolios and green energy stocks may move on this news.",
  };

  // Default: only citizen gets a line — truly generic news affects everyone vaguely
  // but we only assert that for the broadest persona
  return {
    citizen: "This news may have indirect effects on public life — staying informed helps you make better decisions.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePerspectives(title, description, category) {

  // ── Try Gemini ─────────────────────────────────────────────────────────────
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(buildPrompt(title, description, category));
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");
    const parsed = JSON.parse(jsonMatch[0]);

    // Keep only entries where the value is a non-empty, non-null string
    const relevant = PERSONAS.filter(p => {
      const val = parsed[p.id];
      return (
        val !== null &&
        val !== undefined &&
        typeof val === "string" &&
        val.trim().length > 0 &&
        val.trim().toLowerCase() !== "null"
      );
    });

    if (relevant.length === 0) throw new Error("AI returned no relevant perspectives");

    return relevant.map(p => ({
      id:    p.id,
      label: p.label,
      emoji: p.emoji,
      text:  parsed[p.id].trim(),
    }));

  } catch (err) {
    console.warn("perspectiveService AI failed, using rule-based fallback:", err.message);

    // ── Rule-based fallback — only relevant personas ───────────────────────
    const relevantMap = buildFallback(title, category);

    const results = PERSONAS
      .filter(p => relevantMap[p.id])
      .map(p => ({
        id:    p.id,
        label: p.label,
        emoji: p.emoji,
        text:  relevantMap[p.id],
      }));

    // If even the fallback returns nothing (shouldn't happen), return empty
    return results;
  }
}
