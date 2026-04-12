// utils/priorityHelper.js
export const getPriority = (title) => {
  const urgentKeywords = ["storm", "emergency", "shortage", "danger"];

  if (urgentKeywords.some(k => title.toLowerCase().includes(k))) {
    return "HIGH";
  }
  return "NORMAL";
};