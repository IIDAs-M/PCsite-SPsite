import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const MOBILE_CSS = `
<style id="__mobile_override__">
  *, *::before, *::after { box-sizing: border-box !important; }
  html { font-size: 16px !important; }
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
    margin: 0 !important;
    padding: 8px !important;
    font-size: 16px !important;
    line-height: 1.6 !important;
    word-break: break-word !important;
  }
  img, video, iframe, table {
    max-width: 100% !important;
    height: auto !important;
  }
  table { display: block !important; overflow-x: auto !important; }
  div, section, article, aside, main, header, footer, nav {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  [style*="width"] { max-width: 100% !important; }
  pre, code { white-space: pre-wrap !important; word-break: break-all !important; }
  /* Prevent fixed/absolute positioned overlays from obscuring content */
  [style*="position:fixed"], [style*="position: fixed"] {
    position: static !important;
  }
</style>
`;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = new URL(url).toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MobileConverter/1.0; +https://github.com/iidas-m/pcsite-spsite)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return NextResponse.json(
        { error: "The URL does not return an HTML page." },
        { status: 422 }
      );
    }

    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    html = decoder.decode(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch error: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const $ = cheerio.load(html);

  // Ensure viewport meta exists
  const existingViewport = $('meta[name="viewport"]');
  if (existingViewport.length === 0) {
    $("head").append(
      '<meta name="viewport" content="width=device-width, initial-scale=1">'
    );
  } else {
    existingViewport.attr("content", "width=device-width, initial-scale=1");
  }

  // Remove fixed width on body/html
  $("body, html").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    $(el).attr(
      "style",
      style.replace(/width\s*:\s*\d+px/gi, "width:100%")
    );
  });

  // Inject mobile override CSS before </head>
  $("head").append(MOBILE_CSS);

  // Rewrite relative URLs to absolute
  const base = new URL(targetUrl);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.startsWith("http") && !href.startsWith("//") && !href.startsWith("#")) {
      try {
        $(el).attr("href", new URL(href, base).toString());
      } catch {}
    }
  });
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!src.startsWith("http") && !src.startsWith("//") && !src.startsWith("data:")) {
      try {
        $(el).attr("src", new URL(src, base).toString());
      } catch {}
    }
  });
  $("link[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.startsWith("http") && !href.startsWith("//")) {
      try {
        $(el).attr("href", new URL(href, base).toString());
      } catch {}
    }
  });
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!src.startsWith("http") && !src.startsWith("//")) {
      try {
        $(el).attr("src", new URL(src, base).toString());
      } catch {}
    }
  });

  const transformed = $.html();

  return new NextResponse(transformed, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
