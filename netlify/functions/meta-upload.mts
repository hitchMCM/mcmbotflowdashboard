import type { Context } from "@netlify/functions";

/**
 * Netlify serverless function: meta-upload
 * 
 * Server-side proxy for uploading media to Meta's Resumable Upload API.
 * Avoids CORS issues by running the fetch+upload on the server side.
 * 
 * POST /.netlify/functions/meta-upload
 * Body: { imageUrl, accessToken, mimeType }
 * Returns: { success, handle } or { success: false, error }
 */

export default async (req: Request, _context: Context) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let params: { imageUrl: string; accessToken: string; mimeType?: string };
  try {
    params = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { imageUrl, accessToken, mimeType = "image/png" } = params;
  if (!imageUrl || !accessToken) {
    return new Response(JSON.stringify({ success: false, error: "Missing imageUrl or accessToken" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[meta-upload] Downloading image:", imageUrl);

    // Step 1: Download the image (server-side, no CORS)
    const imageResponse = await fetch(imageUrl, { redirect: "follow" });
    if (!imageResponse.ok) {
      return jsonResponse({ success: false, error: `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}` });
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log("[meta-upload] Downloaded:", imageBuffer.byteLength, "bytes");

    // Step 2: Create upload session on Meta
    const sessionUrl = `https://graph.facebook.com/v25.0/app/uploads?file_length=${imageBuffer.byteLength}&file_type=${encodeURIComponent(mimeType)}&access_token=${encodeURIComponent(accessToken)}`;
    const sessionResponse = await fetch(sessionUrl, { method: "POST" });
    const sessionData = await sessionResponse.json();
    console.log("[meta-upload] Session:", JSON.stringify(sessionData));

    if (!sessionData.id) {
      return jsonResponse({
        success: false,
        error: `Upload session failed: ${sessionData.error?.message || JSON.stringify(sessionData)}`,
      });
    }

    // Step 3: Upload binary data
    const uploadUrl = `https://graph.facebook.com/v25.0/${sessionData.id}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: "0",
        "Content-Type": mimeType,
      },
      body: imageBuffer,
    });
    const uploadData = await uploadResponse.json();
    console.log("[meta-upload] Upload result:", JSON.stringify(uploadData));

    if (uploadData.h) {
      return jsonResponse({ success: true, handle: uploadData.h });
    } else {
      return jsonResponse({
        success: false,
        error: `Upload failed: ${uploadData.error?.message || JSON.stringify(uploadData)}`,
      });
    }
  } catch (err: any) {
    console.error("[meta-upload] Error:", err);
    return jsonResponse({ success: false, error: err.message || "Server error" }, 500);
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
