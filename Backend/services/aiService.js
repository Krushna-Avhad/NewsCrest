// // services/aiService.js
// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

export const summarizeNews = async (text) => {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Summarize news in 2-3 lines" },
      { role: "user", content: text },
    ],
  });

  return response.choices[0].message.content;
};

export const filterNewsAdvanced = (news, user) => {
  return news.filter(item =>
    user.interests.some(i =>
      item.title.toLowerCase().includes(i.toLowerCase())
    )
  );
};