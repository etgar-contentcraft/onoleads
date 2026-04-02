/**
 * YouTube Metadata API — fetches video info and playlist data without requiring a YouTube API key.
 *
 * Endpoints:
 *   GET /api/youtube-meta?v=VIDEO_ID    → { title, description, duration, thumbnail_url }
 *   GET /api/youtube-meta?list=PLAYLIST_ID → { title, videos: [{ youtube_id, title, duration }] }
 *
 * Uses YouTube oEmbed for title + page scraping for duration/description.
 */

import { NextRequest, NextResponse } from "next/server";

/** Maximum time (ms) to wait for YouTube page fetch */
const FETCH_TIMEOUT = 8000;

/**
 * Formats raw seconds into a human-friendly duration string (e.g. "3:45" or "1:02:15").
 * @param totalSeconds - Duration in seconds
 * @returns Formatted string like "3:45"
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Fetches metadata for a single YouTube video by scraping the watch page.
 * Extracts title from oEmbed, duration from embedded JSON, description from meta tags.
 * @param videoId - 11-character YouTube video ID
 * @returns Video metadata object
 */
async function fetchVideoMeta(videoId: string) {
  const result = { title: "", description: "", duration: "", thumbnail_url: "" };

  // 1. oEmbed — reliable source for title and thumbnail
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      result.title = data.title || "";
      result.thumbnail_url = data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {
    /* oEmbed failed — we'll try the page scrape below */
  }

  // 2. Scrape the video page for duration and description
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OnoLeadsBot/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract duration from "lengthSeconds":"123" pattern in ytInitialPlayerResponse
      const durationMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
      if (durationMatch) {
        result.duration = formatDuration(parseInt(durationMatch[1], 10));
      }

      // Extract description from meta tag (more reliable than JSON scraping)
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*?)"/);
      if (descMatch) {
        result.description = decodeHtmlEntities(descMatch[1]);
      }

      // Fallback title from page if oEmbed failed
      if (!result.title) {
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]*?)"/);
        if (titleMatch) {
          result.title = decodeHtmlEntities(titleMatch[1]);
        }
      }
    }
  } catch {
    /* page scrape failed — return whatever we have */
  }

  // Fallback thumbnail
  if (!result.thumbnail_url) {
    result.thumbnail_url = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return result;
}

/**
 * Fetches all videos from a YouTube playlist by scraping the playlist page.
 * Extracts video IDs, titles, and durations from the embedded ytInitialData JSON.
 * @param playlistId - YouTube playlist ID (e.g. "PLxyz...")
 * @returns Playlist title and array of video items
 */
async function fetchPlaylistMeta(playlistId: string) {
  const result: {
    title: string;
    videos: { youtube_id: string; title: string; duration: string; thumbnail_url: string }[];
  } = { title: "", videos: [] };

  try {
    const pageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OnoLeadsBot/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!pageRes.ok) {
      return result;
    }

    const html = await pageRes.text();

    // Extract ytInitialData JSON blob from the page
    const dataMatch = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (!dataMatch) return result;

    const ytData = JSON.parse(dataMatch[1]);

    // Navigate the nested structure to find playlist items
    const playlistHeader = ytData?.header?.playlistHeaderRenderer;
    result.title = playlistHeader?.title?.simpleText || "";

    // Playlist videos are in contents → twoColumnBrowseResultsRenderer → tabs → tabRenderer → content
    const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs;
    if (!tabs || !Array.isArray(tabs)) return result;

    const tabContent = tabs[0]?.tabRenderer?.content;
    const sectionListContents = tabContent?.sectionListRenderer?.contents;
    if (!sectionListContents) return result;

    const playlistItems =
      sectionListContents[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;

    if (!Array.isArray(playlistItems)) return result;

    for (const item of playlistItems) {
      const renderer = item?.playlistVideoRenderer;
      if (!renderer) continue;

      const videoId = renderer.videoId;
      const title = renderer.title?.runs?.[0]?.text || "";
      const lengthText = renderer.lengthText?.simpleText || "";
      const thumbnail = renderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "";

      if (videoId) {
        result.videos.push({
          youtube_id: videoId,
          title,
          duration: lengthText,
          thumbnail_url: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      }
    }
  } catch {
    /* parsing failed — return whatever we found */
  }

  return result;
}

/**
 * Decodes basic HTML entities in a string.
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Extracts a playlist ID from a YouTube URL.
 * Supports: youtube.com/playlist?list=PLxyz, youtube.com/watch?v=abc&list=PLxyz
 * @param input - YouTube URL or playlist ID
 * @returns Playlist ID or empty string
 */
function extractPlaylistId(input: string): string {
  if (!input) return "";
  // Bare playlist ID (starts with PL, OL, UU, etc.)
  if (/^[A-Za-z0-9_-]{10,}$/.test(input) && !input.includes("/")) return input;
  try {
    const url = new URL(input);
    return url.searchParams.get("list") || "";
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const videoId = searchParams.get("v") || "";
  const playlistParam = searchParams.get("list") || "";

  // Playlist mode
  if (playlistParam) {
    const playlistId = extractPlaylistId(playlistParam);
    if (!playlistId) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }
    const data = await fetchPlaylistMeta(playlistId);
    return NextResponse.json(data);
  }

  // Single video mode
  if (videoId) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }
    const data = await fetchVideoMeta(videoId);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Provide ?v=VIDEO_ID or ?list=PLAYLIST_ID" }, { status: 400 });
}
