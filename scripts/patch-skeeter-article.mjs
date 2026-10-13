import fs from "fs";
import path from "path";

const envPath = path.resolve(".env");
const envContent = fs.readFileSync(envPath, "utf8");
let supabaseUrl = "https://dsyxiowlipttwjuhoqio.supabase.co";
let supabaseKey = "";
for (const line of envContent.split("\n")) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let val = (m[2] || "").trim().replace(/^["']|["']$/g, "");
    if (m[1] === "SUPABASE_URL") supabaseUrl = val;
    if (m[1] === "SUPABASE_SECRET_KEY") supabaseKey = val;
  }
}

async function run() {
  const mdPath = path.resolve("articles/skeeter-davis-the-end-of-the-world/article.md");
  const articleContent = fs.readFileSync(mdPath, "utf8");
  console.log(`Loaded article: ${articleContent.length} chars`);

  // Fetch current row to get existing production_plan
  const fetchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.06d01968-39f6-4e72-9381-48dd47380ab9`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const rows = await fetchRes.json();
  if (!rows || rows.length === 0) {
    throw new Error("Row not found in published_news");
  }
  const row = rows[0];
  const prodPlan = row.production_plan || {};
  prodPlan.article_slug = "skeeter-davis-the-end-of-the-world";
  prodPlan.cover_url = "/covers/elfindelmundodeskeeterdavis.webp";
  prodPlan.cover_image = "/covers/elfindelmundodeskeeterdavis.webp";

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.06d01968-39f6-4e72-9381-48dd47380ab9`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      web_article: articleContent,
      production_plan: prodPlan
    })
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`Failed to patch row: ${patchRes.status} ${errText}`);
  }

  const updatedRows = await patchRes.json();
  console.log("Successfully updated row:", updatedRows[0].id);
  console.log("Updated web_article length:", updatedRows[0].web_article?.length);
  console.log("Updated article_slug:", updatedRows[0].production_plan?.article_slug);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
