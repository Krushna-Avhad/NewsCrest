// backend/scripts/cleanDuplicates.js
import mongoose from "mongoose";
import News from "../models/News.js";
import dotenv from "dotenv";

dotenv.config();

async function cleanDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔗 Connected to MongoDB...");

    console.log("🧹 Finding duplicate articles by URL...");

    // Find all URLs that appear more than once
    const duplicates = await News.aggregate([
      {
        $group: {
          _id: "$url",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          titles: { $first: "$title" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    console.log(`📊 Found ${duplicates.length} duplicate groups`);

    let totalDeleted = 0;

    for (const dup of duplicates) {
      const [keepId, ...deleteIds] = dup.ids; // Keep the first one, delete the rest

      if (deleteIds.length > 0) {
        const result = await News.deleteMany({ _id: { $in: deleteIds } });
        totalDeleted += result.deletedCount;
        console.log(
          `🗑️  Kept: ${dup.titles?.slice(0, 60)}... | Deleted: ${result.deletedCount} duplicates`,
        );
      }
    }

    console.log(
      `\n🎉 Cleanup completed! Total duplicates removed: ${totalDeleted}`,
    );
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

cleanDuplicates();
