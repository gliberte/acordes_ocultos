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
  const mdPath = path.resolve("articles/the-beatles-a-day-in-the-life/article.md");
  const articleContent = fs.readFileSync(mdPath, "utf8");
  console.log(`Loaded Beatles article: ${articleContent.length} chars`);

  const id = "6d1a8f49-7461-45f8-8fae-5e7ab6574305";

  const fetchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${id}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const rows = await fetchRes.json();
  if (!rows || rows.length === 0) {
    throw new Error(`Row ${id} not found`);
  }
  const row = rows[0];
  const prodPlan = row.production_plan || {};
  prodPlan.article_slug = "the-beatles-a-day-in-the-life";
  prodPlan.cover_url = "/covers/elacordemasfamosodelahistoria.webp";
  prodPlan.cover_image = "/covers/elacordemasfamosodelahistoria.webp";

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

run().catch(err => {
  console.error(err);
  process.exit(1);
});
