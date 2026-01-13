/**
 * Script to regenerate slugs for all blogs
 * Run with: npx tsx scripts/regenerateBlogSlugs.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { BlogModel } from "../src/modules/cms/blog/model";
import { slugify } from "../src/lib/slug";

dotenv.config();

async function regenerateSlugs() {
  const URI = process.env.MONGODB_URI || "";
  if (!URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  try {
    await mongoose.connect(URI);
    console.log("✅ Connected to MongoDB");

    const blogs = await BlogModel.find({}).exec();
    console.log(`📝 Found ${blogs.length} blogs to process`);

    let updated = 0;
    let skipped = 0;

    for (const blog of blogs) {
      const expectedSlug = slugify(blog.title);
      
      // If slug is missing or doesn't match the title, regenerate it
      if (!blog.slug || blog.slug !== expectedSlug) {
        // Check if the expected slug is already taken by another blog
        let newSlug = expectedSlug;
        if (!newSlug) newSlug = "post";
        
        let candidate = newSlug;
        let suffix = 1;
        
        while (true) {
          const existing = await BlogModel.findOne({ 
            slug: candidate,
            _id: { $ne: blog._id }
          });
          
          if (!existing) {
            break;
          }
          suffix += 1;
          candidate = `${newSlug}-${suffix}`;
        }

        blog.slug = candidate;
        await blog.save();
        console.log(`✅ Updated blog "${blog.title}" → slug: "${candidate}"`);
        updated++;
      } else {
        console.log(`⏭️  Skipped blog "${blog.title}" (slug already correct)`);
        skipped++;
      }
    }

    console.log(`\n✨ Done! Updated: ${updated}, Skipped: ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

regenerateSlugs();

