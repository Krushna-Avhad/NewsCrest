import axios from "axios";

export const factCheck = async ({ title }) => {
  try {
    // 🔍 Fetch related news
    const res = await axios.get(
      `https://newsdata.io/api/1/news?apikey=${process.env.NEWS_API_KEY}&q=${encodeURIComponent(
        title
      )}&language=en`
    );

    const articles = res.data.results || [];

    const sourceNames = articles
      .slice(0, 3)
      .map((a) => a.source_id || "Unknown");

    const count = articles.length;

    // 🎯 Score logic
    let score = Math.min(100, count * 20);

    let status = "Potentially Misleading";
    if (score >= 80) status = "Verified";
    else if (score >= 50) status = "Mixed / Needs Context";

    return {
      status,
      confidence: score,
      reason:
        count > 3
          ? "Multiple sources report similar information."
          : "Limited or inconsistent reporting across sources.",
      sources: sourceNames,
      totalSources: count,
    };
  } catch (err) {
    console.error(err);
    return {
      status: "Unclear",
      confidence: 40,
      reason: "Unable to verify due to limited data.",
      sources: [],
      totalSources: 0,
    };
  }
};