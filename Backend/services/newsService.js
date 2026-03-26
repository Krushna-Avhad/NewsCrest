import axios from "axios";

export const fetchNews = async () => {
  const response = await axios.get(
    `https://newsapi.org/v2/top-headlines?country=in&apiKey=YOUR_API_KEY`
  );
  return response.data.articles;
};