import { readdir, readFile, mkdir } from "fs/promises";
import { join, basename } from "path";

const CHAPTERS_DIR = "content/chapters";
const OUTPUT_JSON = "static/chapters.json";
const OUTPUT_RSS = "static/feed.xml";
const HUGO_CONFIG_FILE = "hugo.yaml";
const INDEX_FILE = "content/_index.md";

async function extractMetadata() {
    const configContent = await readFile(HUGO_CONFIG_FILE, "utf-8");
    const baseUrlMatch = configContent.match(/^baseURL:\s*(['"]?)(.*?)\1\s*$/m);
    const titleMatch = configContent.match(/^title:\s*(['"]?)(.*?)\1\s*$/m);

    let baseURLStr = baseUrlMatch ? baseUrlMatch[2] : "https://example.com";

    const parsedUrl = new URL(baseURLStr);
    const origin = parsedUrl.origin;
    let relUrl = parsedUrl.pathname;

    if (!relUrl.endsWith("/")) relUrl += "/";

    const siteTitle = titleMatch ? titleMatch[2] : "Myriad Paths";

    const indexContent = await readFile(INDEX_FILE, "utf-8");
    const descMatch = indexContent.match(/^description:\s*(['"]?)(.*?)\1\s*$/m);
    const description = descMatch
        ? descMatch[2]
        : "Journey through Myriad Paths chapters.";

    return { origin, relUrl, siteTitle, description };
}

async function generateMetadata() {
    const { origin, relUrl, siteTitle, description } = await extractMetadata();

    let existingDates = new Map<number, string>();
    try {
        const cachedContent = await readFile(OUTPUT_JSON, "utf-8");
        const cachedChapters = JSON.parse(cachedContent);
        for (const ch of cachedChapters) {
            existingDates.set(ch.id, ch.date);
        }
        console.log("Loaded existing dates from cached chapters.json.");
    } catch (error) {
        console.log("No existing chapters.json found. Creating from scratch.");
    }

    const files = await readdir(CHAPTERS_DIR);
    const markdownFiles = files.filter(
        (f) => f.endsWith(".md") || f.endsWith(".mdx"),
    );

    const chapters: Array<{
        id: number;
        title: string;
        date: string;
        url: string;
    }> = [];
    const regex = /^#\s*Chapter\s+(\d+):\s*(.*)$/m;

    for (const file of markdownFiles) {
        const filePath = join(CHAPTERS_DIR, file);
        const content = await readFile(filePath, "utf-8");
        const match = content.match(regex);

        if (match) {
            const chapterNumStr = match[1];
            const chapterNum = parseInt(chapterNumStr, 10);
            const title = match[2].trim();
            const slug = basename(file, ".md");

            const url = `${relUrl}chapters/${slug}/`;

            let chapterDate = existingDates.get(chapterNum);
            if (!chapterDate) {
                chapterDate = new Date().toUTCString();
                console.log(
                    `New chapter: Chapter ${chapterNum}. Assigning timestamp.`,
                );
            }

            chapters.push({
                id: chapterNum,
                title,
                date: chapterDate,
                url,
            });
        }
    }

    const jsonChapters = [...chapters].sort((a, b) => a.id - b.id);
    const rssChapters = [...chapters].sort((a, b) => b.id - a.id);

    const itemsXml = rssChapters
        .map(
            (ch) => `    <item>
      <title>${siteTitle} - Chapter ${ch.id}</title>
      <link>${origin}${ch.url}</link>
      <pubDate>${ch.date}</pubDate>
      <guid>${origin}${ch.url}</guid>
      <chapter>${ch.id}</chapter>
    </item>`,
        )
        .join("\n");

    const rssXml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteTitle} - Chapters Feed</title>
    <link>${origin}${relUrl}</link>
    <description>${description}</description>
    <generator>tg</generator>
    <language>en-us</language>
    <atom:link href="${origin}${relUrl}index.rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

    await mkdir("static", { recursive: true });
    await Bun.write(OUTPUT_JSON, JSON.stringify(jsonChapters, null, 2));
    await Bun.write(OUTPUT_RSS, rssXml);

    console.log("Metadata generation complete!");
}

generateMetadata().catch(console.error);
