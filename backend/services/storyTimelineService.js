// services/storyTimelineService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import StoryTimeline from "../models/StoryTimeline.js";
import UserActivity from "../models/UserActivity.js";
import News from "../models/News.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function toSlug(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").slice(0,80);
}

const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","was","are","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","that","this","these","those","it","its","he","she","they","we","you","i","my","your","his","her","their","our","as","by","from","up","about","into","through","during","before","after","above","below","between","out","off","over","under","again","then","once","here","there","when","where","why","how","all","both","each","few","more","most","other","some","such","no","not","only","same","so","than","too","very","just","also","said","says","new","news","india","report","reports","after","while","amid"]);

function localExtractKeywords(text="", title="") {
  const combined = `${title} ${text}`.toLowerCase();
  const words = combined.replace(/[^a-z\s]/g," ").split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w]||0)+1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([w])=>w);
}

function localExtractEntities(text="", title="") {
  const combined = `${title} ${text}`;
  const found = new Set();
  let m;
  const re = /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})*)\b/g;
  while ((m=re.exec(combined))!==null) { if(m[1].length<=40) found.add(m[1]); }
  return [...found].slice(0,6);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PERSIST USER ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────
export async function recordUserActivity(userId, action, article) {
  try {
    if (!userId || !article) return;
    if (action === "read" && article._id) {
      const recent = await UserActivity.findOne({ userId, articleId: article._id, action:"read", actedAt:{ $gte: new Date(Date.now()-15*60*1000) } });
      if (recent) return;
    }
    const contentText = article.content || article.summary || article.description || "";
    const keywords = article.tags?.length ? article.tags : localExtractKeywords(contentText, article.title);
    const entities = localExtractEntities(contentText, article.title);
    await UserActivity.create({
      userId, action,
      articleId: article._id || null,
      snapshot: {
        title:       article.title       || "",
        description: article.summary     || article.description || "",
        content:     contentText.slice(0,2000),
        url:         article.url         || "",
        imageUrl:    article.imageUrl    || article.urlToImage || "",
        source:      typeof article.source==="object" ? (article.source?.name||"") : (article.source||""),
        category:    article.category    || "",
        publishedAt: article.publishedAt || null,
        keywords, entities,
      },
      actedAt: new Date(),
    });
  } catch(err) { console.warn("recordUserActivity failed:", err.message); }
}

export async function getUserActivityHistory(userId, limit=30) {
  const activities = await UserActivity.find({ userId, action:{$in:["read","saved","manual_input"]} }).sort({actedAt:-1}).limit(limit);
  const seen = new Set();
  return activities.filter(a => {
    const key = a.snapshot?.title?.toLowerCase() || a._id.toString();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AI METADATA EXTRACTION (with local fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function extractStoryMeta(article) {
  const title    = article.title    || article.snapshot?.title    || "";
  const content  = article.content  || article.snapshot?.content  || article.summary || article.snapshot?.description || "";
  const category = article.category || article.snapshot?.category || "General";
  try {
    const model = genAI.getGenerativeModel({ model:"gemini-2.5-flash" });
    const result = await model.generateContent(`You are a news analysis AI. Extract story metadata.\n\nTitle: "${title}"\nContent: "${content.slice(0,800)}"\nCategory: "${category}"\n\nRespond ONLY in valid JSON:\n{"storyTitle":"concise 5-8 word story name","storySlug":"url-safe-slug-max-60-chars","keywords":["3 to 6 lowercase topic keywords"],"entities":["named people/orgs/places max 5"],"eventLabel":"one of: Origin|Breaking|Update|Announced|Reaction|Development|Outcome|Resolution"}`);
    const raw = result.response.text().replace(/\`\`\`json|\`\`\`/g,"").trim();
    const p = JSON.parse(raw);
    return {
      storyTitle: p.storyTitle || title.slice(0,60),
      storySlug:  p.storySlug  || toSlug(title),
      keywords:   Array.isArray(p.keywords) ? p.keywords.map(k=>k.toLowerCase()) : [],
      entities:   Array.isArray(p.entities) ? p.entities : [],
      eventLabel: p.eventLabel || "Update",
    };
  } catch(err) {
    console.warn("extractStoryMeta AI failed, using local:", err.message);
    return {
      storyTitle:  title.slice(0,60),
      storySlug:   toSlug(title)+"-"+Date.now().toString().slice(-5),
      keywords:    localExtractKeywords(content, title),
      entities:    localExtractEntities(content, title),
      eventLabel:  "Update",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. IMPROVED STORY MATCHING
// ─────────────────────────────────────────────────────────────────────────────
export async function findMatchingStory(article, meta) {
  const artTitle    = (article.title||"").toLowerCase();
  const artKeywords = (meta.keywords||[]).map(k=>k.toLowerCase());
  const artEntities = (meta.entities||[]).map(e=>e.toLowerCase());
  const artCategory = (article.category||"").toLowerCase();
  if (!artKeywords.length && !artEntities.length) return null;

  const candidates = await StoryTimeline.find({
    isActive:true,
    $or:[
      { keywords:{ $in: artKeywords } },
      { entities:{ $in: meta.entities } },
      { category: article.category },
    ],
  }).limit(20);

  let best=null, bestScore=0;
  for (const story of candidates) {
    const sk = (story.keywords||[]).map(k=>k.toLowerCase());
    const se = (story.entities||[]).map(e=>e.toLowerCase());
    const st = (story.title||"").toLowerCase();
    let score=0;
    artKeywords.forEach(k=>{ if(sk.includes(k)) score+=2; });
    artEntities.forEach(e=>{ if(se.includes(e)) score+=3; });
    if (artCategory && story.category?.toLowerCase()===artCategory) score+=1;
    artTitle.split(/\s+/).filter(w=>w.length>4).forEach(w=>{ if(st.includes(w)) score+=1; });
    if (score>=4 && score>bestScore) { best=story; bestScore=score; }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE INGESTION
// ─────────────────────────────────────────────────────────────────────────────
export async function processArticleIntoTimeline(article) {
  try {
    const meta = await extractStoryMeta(article);
    const existing = await findMatchingStory(article, meta);
    const articleIdStr = (article._id||article.id)?.toString();

    if (existing) {
      const alreadyAdded = existing.articles.some(a=>a.articleId?.toString()===articleIdStr);
      if (!alreadyAdded && articleIdStr) {
        existing.articles.push({ articleId:article._id||article.id, addedAt:new Date(), isOrigin:false, eventLabel:meta.eventLabel||"Update" });
        existing.keywords     = [...new Set([...existing.keywords,...meta.keywords])];
        existing.entities     = [...new Set([...existing.entities,...meta.entities])];
        existing.lastUpdatedAt = new Date();
        await existing.save();
      }
      return existing;
    }

    const slug = toSlug(meta.storySlug||meta.storyTitle)+"-"+Date.now().toString().slice(-6);
    const story = new StoryTimeline({
      seedArticleId:  article._id||article.id||null,
      storySlug:      slug,
      title:          meta.storyTitle,
      category:       article.category||"",
      keywords:       meta.keywords||[],
      entities:       meta.entities||[],
      articles:[{ articleId:article._id||article.id||null, addedAt:new Date(), isOrigin:true, eventLabel:meta.eventLabel||"Origin" }],
      lastUpdatedAt:  new Date(),
    });
    await story.save();
    return story;
  } catch(err) { console.error("processArticleIntoTimeline:", err.message); return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. API-INDEPENDENT FALLBACK — build from UserActivity history
// ─────────────────────────────────────────────────────────────────────────────
export async function buildTimelineFromHistory(userId, limit=6) {
  const activities = await getUserActivityHistory(userId, 60);
  if (!activities.length) return [];

  const clusters = [];
  for (const activity of activities) {
    const kw  = activity.snapshot?.keywords||[];
    const ent = activity.snapshot?.entities||[];
    const all = [...kw,...ent].map(t=>t.toLowerCase());
    let placed=false;
    for (const cluster of clusters) {
      const overlap = all.filter(t=>cluster.terms.includes(t)).length;
      if (overlap>=3) { cluster.activities.push(activity); cluster.terms=[...new Set([...cluster.terms,...all])]; placed=true; break; }
    }
    if (!placed) clusters.push({ terms:all, activities:[activity] });
  }

  return clusters
    .filter(c=>c.activities.length>=2)
    .sort((a,b)=>b.activities.length-a.activities.length)
    .slice(0,limit)
    .map((cluster,idx)=>{
      const sorted=[...cluster.activities].sort((a,b)=>new Date(a.actedAt)-new Date(b.actedAt));
      const rep=sorted[0].snapshot;
      return {
        _id:`local-${idx}-${Date.now()}`,
        title: rep?.title?.slice(0,70)||`Story ${idx+1}`,
        category: rep?.category||"",
        keywords: [...new Set(cluster.terms)].slice(0,8),
        entities: [],
        isLocalFallback: true,
        lastUpdatedAt: sorted[sorted.length-1].actedAt,
        articles: sorted.map((act,i)=>({
          articleId:{
            _id:act.articleId?.toString()||`local-art-${i}`,
            title:act.snapshot.title, summary:act.snapshot.description,
            imageUrl:act.snapshot.imageUrl, category:act.snapshot.category,
            source:act.snapshot.source, publishedAt:act.snapshot.publishedAt,
            url:act.snapshot.url, readTime:null,
          },
          isOrigin:i===0,
          eventLabel:i===0?"Origin":act.action==="saved"?"Saved":"Update",
          addedAt:act.actedAt,
        })),
        newArticlesCount:0,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STRICT RELEVANCE SCORING — used by generateTimelineFromInput
// Every candidate article is scored against the input keywords + entities.
// Only articles scoring above MIN_SCORE are included in the result.
// ─────────────────────────────────────────────────────────────────────────────
const MIN_SCORE = 5; // minimum score for inclusion — strict topic match required

function scoreArticleRelevance(article, inputKeywords, inputEntities, inputTermsRaw) {
  // Combine all searchable text from the article (lowercase)
  const haystack = [
    article.title    || "",
    article.summary  || article.description || "",
    article.content  || "",
    ...(article.tags || []),
  ].join(" ").toLowerCase();

  let score = 0;

  // 1. Each input keyword found in title → +3 (title match is strong signal)
  const titleLower = (article.title || "").toLowerCase();
  inputKeywords.forEach(kw => {
    if (titleLower.includes(kw)) score += 3;
  });

  // 2. Each input keyword found in body → +1
  inputKeywords.forEach(kw => {
    if (haystack.includes(kw)) score += 1;
  });

  // 3. Entity match (proper nouns) → +4 each — very strong signal
  inputEntities.forEach(ent => {
    if (haystack.includes(ent.toLowerCase())) score += 4;
  });

  // 4. STRICT: all input content-words must appear somewhere → bonus +3
  // This prevents "oppo" matching an article that only contains "phone"
  const allPresent = inputTermsRaw.every(term => haystack.includes(term));
  if (allPresent && inputTermsRaw.length >= 2) score += 3;

  // 5. Multi-word exact phrase match → +5 (e.g. "oppo phone" as a phrase)
  const phrase = inputTermsRaw.join(" ");
  if (phrase.length > 3 && haystack.includes(phrase)) score += 5;

  // 6. HARD GATE: at least one raw input term must appear in the article title.
  // Without this, an article about "Samsung phone" could score 5 for "Oppo phone"
  // purely through body-text keyword hits.
  const titleHasAtLeastOneTerm = inputTermsRaw.some(term => titleLower.includes(term));
  if (!titleHasAtLeastOneTerm) return 0;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MANUAL INPUT TIMELINE GENERATION (strict filtering)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTimelineFromInput(inputText, userId=null) {
  if (!inputText?.trim()) return null;

  const meta = await extractStoryMeta({ title:inputText, content:inputText, summary:inputText, category:"General" });
  const keywordSet = meta.keywords||[];
  const entitySet  = meta.entities||[];

  // Build the raw input terms for strict matching (strip stop-words, min 2 chars)
  const inputTermsRaw = inputText.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  const rawResults = [];

  // ── Search News DB ─────────────────────────────────────────────────────────
  if (keywordSet.length || inputTermsRaw.length) {
    try {
      // Fetch a broad candidate set using MongoDB regex — scoring will filter strictly
      const searchTerms = [...new Set([...keywordSet, ...inputTermsRaw])].slice(0, 5);
      const dbArticles = await News.find({
        $or: searchTerms.map(term => ({
          title: { $regex: term, $options: "i" }
        })),
      }).sort({ publishedAt: -1 }).limit(50)
        .select("title summary imageUrl category source publishedAt url readTime content tags");

      dbArticles.forEach(a => {
        const score = scoreArticleRelevance(
          { title:a.title, summary:a.summary, content:a.content, tags:a.tags },
          keywordSet, entitySet, inputTermsRaw
        );
        if (score >= MIN_SCORE) {
          rawResults.push({
            score,
            articleId: { _id:a._id, title:a.title, summary:a.summary, imageUrl:a.imageUrl, category:a.category, source:a.source, publishedAt:a.publishedAt, url:a.url, readTime:a.readTime },
            isOrigin:false, eventLabel:"Update", addedAt:a.publishedAt||new Date(), source:"db",
          });
        }
      });
    } catch(err) { console.warn("DB search failed:", err.message); }
  }

  // ── Search UserActivity history ────────────────────────────────────────────
  if (userId && inputTermsRaw.length) {
    try {
      const activities = await UserActivity.find({
        userId, action: { $in: ["read","saved","manual_input"] },
        $or: inputTermsRaw.slice(0,3).map(term => ({
          "snapshot.title": { $regex: term, $options: "i" }
        })),
      }).sort({ actedAt: -1 }).limit(20);

      activities.forEach(act => {
        const isDupe = rawResults.some(r =>
          r.articleId.title?.toLowerCase() === act.snapshot.title?.toLowerCase()
        );
        if (isDupe) return;

        const score = scoreArticleRelevance(
          { title:act.snapshot.title, summary:act.snapshot.description, content:act.snapshot.content, tags:[] },
          keywordSet, entitySet, inputTermsRaw
        );
        if (score >= MIN_SCORE) {
          rawResults.push({
            score,
            articleId: { _id:act.articleId?.toString()||`hist-${act._id}`, title:act.snapshot.title, summary:act.snapshot.description, imageUrl:act.snapshot.imageUrl, category:act.snapshot.category, source:act.snapshot.source, publishedAt:act.snapshot.publishedAt, url:act.snapshot.url, readTime:null },
            isOrigin:false, eventLabel:act.action==="saved"?"Saved":"From History", addedAt:act.actedAt, source:"history",
          });
        }
      });
    } catch(err) { console.warn("History search failed:", err.message); }
  }

  if (!rawResults.length) return null;

  // ── Topic cluster filter ───────────────────────────────────────────────────
  // Sort by score descending, keep only articles in the top cluster.
  // "Top cluster" = articles whose score >= 60% of the highest score found.
  // This eliminates low-relevance stragglers that slipped past MIN_SCORE.
  rawResults.sort((a, b) => b.score - a.score);
  const topScore = rawResults[0].score;
  const clusterThreshold = Math.max(MIN_SCORE, topScore * 0.75);
  const clustered = rawResults.filter(r => r.score >= clusterThreshold);

  // Sort chronologically for the timeline
  clustered.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));

  // Mark origin
  clustered[0].isOrigin = true;
  clustered[0].eventLabel = "Origin";

  // Strip internal score field before returning
  const articles = clustered.map(({ score, ...rest }) => rest);

  return {
    _id: `manual-${Date.now()}`,
    title: meta.storyTitle || inputText.slice(0, 70),
    category: articles[0]?.articleId?.category || "",
    keywords: keywordSet, entities: entitySet,
    isManualInput: true, lastUpdatedAt: new Date(),
    articles, newArticlesCount: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export async function getStoriesForUser(user, limit=6) {
  const userId = user._id||user.id;
  const readIds  = (user.readingHistory||[]).map(r=>r.articleId?.toString()).filter(Boolean);
  const savedIds = (user.savedArticles ||[]).map(s=>s?.toString()).filter(Boolean);
  const allInteracted = [...new Set([...readIds,...savedIds])];

  let stories=[];
  if (allInteracted.length) {
    stories = await StoryTimeline.find({
      isActive:true,
      "articles.articleId":{ $in:allInteracted },
      $expr:{ $gt:[{$size:"$articles"},1] },
    }).sort({lastUpdatedAt:-1}).limit(limit)
      .populate({ path:"articles.articleId", model:"News", select:"title summary imageUrl category source publishedAt url readTime" });
  }

  const shaped = stories.map(s=>{
    const obj=s.toObject();
    obj.articles=obj.articles.filter(a=>a.articleId?.title);
    obj.newArticlesCount=obj.articles.filter(a=>!allInteracted.includes(a.articleId?._id?.toString())).length;
    return obj;
  }).filter(s=>s.articles.length>1);

  // Fallback to local history clustering if not enough DB stories
  if (shaped.length < 2 && userId) {
    const local = await buildTimelineFromHistory(userId, limit);
    return [...shaped, ...local].slice(0, limit);
  }
  return shaped;
}

export async function getStoryById(storyId) {
  return StoryTimeline.findById(storyId).populate({ path:"articles.articleId", model:"News", select:"title summary imageUrl category source publishedAt url readTime content tags" });
}

export async function getTimelineForArticle(articleId) {
  return StoryTimeline.findOne({
    isActive:true, "articles.articleId":articleId,
    $expr:{ $gt:[{$size:"$articles"},1] },
  }).populate({ path:"articles.articleId", model:"News", select:"title summary imageUrl category source publishedAt url readTime" });
}

export async function followStory(storyId, userId, trigger="manual") {
  const story = await StoryTimeline.findById(storyId);
  if (!story) return null;
  const already = story.followers.find(f=>f.userId.toString()===userId.toString());
  if (!already) { story.followers.push({ userId, followedAt:new Date(), trigger }); await story.save(); }
  return story;
}

export async function unfollowStory(storyId, userId) {
  await StoryTimeline.findByIdAndUpdate(storyId, { $pull:{ followers:{ userId } } });
}
