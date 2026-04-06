import dotenv from "dotenv";
import mongoose from "mongoose";
import News from "../models/News.js";

dotenv.config();

const POSITIVE_WORDS = [
  "win","wins","won","victory","success","breakthrough","launch","launches",
  "record","growth","rise","rises","improve","improved","improvement",
  "achieve","achieves","achieved","achievement","award","awards","celebrate",
  "celebrates","celebrated","celebration","historic","milestone","relief",
  "recover","recovery","recovers","boost","boosts","boosted","save","saves",
  "saved","rescue","rescues","rescued","hope","good","great","best",
  "positive","benefit","benefits","help","helps","helped","support",
  "peace","agreement","deal","approved","approve","progress","upgrade",
  "innovation","inspiring","inspired","inspire","happy","happiness","joy",
  "profit","profits","surplus","grant","grants","free","safe","safety"
];

const NEGATIVE_WORDS = [
  "war","wars","attack","attacks","attacked","kill","kills","killed",
  "death","deaths","dead","dies","died","die","murder","murders","murdered",
  "crash","crashes","crashed","accident","accidents","fire","fires",
  "flood","floods","disaster","disasters","crisis","crises","collapse",
  "collapses","collapsed","fail","fails","failed","failure","loss","loses",
  "lost","drop","drops","dropped","fall","falls","fell","ban","bans","banned",
  "arrest","arrests","arrested","charge","charges","charged","scam","scams",
  "fraud","frauds","corrupt","corruption","protest","protests","riot","riots",
  "violence","violent","threat","threats","threatened","danger","dangerous",
  "damage","damages","damaged","destroy","destroys","destroyed","destruction",
  "explosion","explode","bomb","bombs","terror","terrorism","terrorist",
  "shortage","shortages","inflation","recession","debt","deficit","poverty",
  "unemployment","strike","strikes","scandal","controversy","controversial",
  "leak","leaks"
];

function detectSentiment(title, content) {
  const text = `${title || ""} ${content || ""}`.toLowerCase();
  const words = text.split(/\W+/);
  let pos = 0, neg = 0;
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) pos++;
    if (NEGATIVE_WORDS.includes(word)) neg++;
  }
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const articles = await News.find({}, { _id: 1, title: 1, content: 1 });
  console.log(`📰 Updating sentiment for ${articles.length} articles...`);

  let positive = 0, negative = 0, neutral = 0;

  const bulkOps = articles.map(article => {
    const sentiment = detectSentiment(article.title, article.content);
    if (sentiment === "positive") positive++;
    else if (sentiment === "negative") negative++;
    else neutral++;
    return {
      updateOne: {
        filter: { _id: article._id },
        update: { $set: { sentiment } }
      }
    };
  });

  await News.bulkWrite(bulkOps);

  console.log(`✅ Done!`);
  console.log(`   Positive: ${positive}`);
  console.log(`   Negative: ${negative}`);
  console.log(`   Neutral:  ${neutral}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});


// node --experimental-vm-modules scripts/updateSentiment.js