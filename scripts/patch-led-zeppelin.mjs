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
  const chroniclePath = path.resolve("articles/led-zeppelin-whole-lotta-love/article.md");
  const webArticle = fs.readFileSync(chroniclePath, "utf8");
  const rowId = "800650b8-fde3-48f9-824a-6c3defb2c03c";

  // 1. Obtener la fila actual
  const getRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${rowId}&select=*`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const rows = await getRes.json();
  if (!rows || rows.length === 0) {
    console.error("No se encontró la fila con ID:", rowId);
    process.exit(1);
  }

  const row = rows[0];
  let prodPlan = row.production_plan || {};
  prodPlan.article_slug = "led-zeppelin-whole-lotta-love";
  prodPlan.articleSlug = "led-zeppelin-whole-lotta-love";
  prodPlan.cover_url = "/covers/elviajetridimensional.webp";

  const patchBody = {
    web_article: webArticle,
    production_plan: prodPlan,
    image_url: "/covers/elviajetridimensional.webp"
  };

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/published_news?id=eq.${rowId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(patchBody)
  });

  const updatedRows = await patchRes.json();
  console.log("✅ Supabase PATCH exitoso para Led Zeppelin (Whole Lotta Love):");
  console.log("ID:", updatedRows[0]?.id);
  console.log("Title:", updatedRows[0]?.title);
  console.log("Article length:", updatedRows[0]?.web_article?.length);
  console.log("Article slug:", updatedRows[0]?.production_plan?.article_slug);
  console.log("Cover URL:", updatedRows[0]?.image_url);
}

run().catch(console.error);
