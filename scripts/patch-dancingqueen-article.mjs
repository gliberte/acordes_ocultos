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
  const mdPath = path.resolve("articles/abba-dancing-queen/article.md");
  const articleContent = fs.readFileSync(mdPath, "utf8");
  console.log(`Loaded ABBA article: ${articleContent.length} chars`);

  const ids = [
    "75b208e1-5d94-4429-b0fb-949975e1bdc7",
    "96cde445-60a2-4f3f-8e2a-e314fee3ab4c"
  ];

  for (const id of ids) {
    const fetchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${id}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    const rows = await fetchRes.json();
    if (!rows || rows.length === 0) {
      console.warn(`Row ${id} not found`);
      continue;
    }
    const row = rows[0];
    const prodPlan = row.production_plan || {};
    prodPlan.article_slug = "abba-dancing-queen";
    prodPlan.cover_url = "/covers/dancingqueen.webp";
    prodPlan.cover_image = "/covers/dancingqueen.webp";

    const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${id}`, {
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
      console.error(`Error patching ${id}: ${patchRes.status} ${errText}`);
    } else {
      const updated = await patchRes.json();
      console.log(`✅ Successfully updated ${id} (article len: ${updated[0]?.web_article?.length})`);
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
