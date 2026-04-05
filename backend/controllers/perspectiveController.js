// controllers/perspectiveController.js
import { generatePerspectives } from "../services/perspectiveService.js";

// POST /api/perspective
// Body: { title, description, category }
export const getPerspectives = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Article title is required" });
    }

    const perspectives = await generatePerspectives(
      title.trim(),
      (description || "").trim(),
      (category || "General").trim()
    );

    res.json({ perspectives });
  } catch (err) {
    console.error("getPerspectives error:", err.message);
    res.status(500).json({ error: "Failed to generate perspectives" });
  }
};
