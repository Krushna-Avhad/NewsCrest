// Dummy safe controller (no crash)

export const getAlerts = async (req, res) => {
  res.json([]);
};

export const createAlert = async (req, res) => {
  res.json({ message: "Alert created" });
};

export const deleteAlert = async (req, res) => {
  res.json({ message: "Alert deleted" });
};

// ✅ FIXED (THIS WAS MISSING)
export const clearAllAlerts = async (req, res) => {
  res.json({ message: "All alerts cleared" });
};