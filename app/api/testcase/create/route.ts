import { NextResponse } from "next/server";

// Minimal server-side create using PAT from request (for demo).
// For production, store PAT securely server-side after /api/auth/connect.
export async function POST(req: Request) { 
  try {
    const patchBody = await req.json();
    const orgName = process.env.AZURE_DEVOPS_ORG!;
    const projectName = process.env.AZURE_DEVOPS_PROJECT!;
    const pat = process.env.AZURE_DEVOPS_PAT!;
    const orgUrl = `https://tlvtfs03.ciosus.com/tfs/${projectName}/_apis/wit/workitems/$Test%20Case?api-version=5.0`;
    const auth = Buffer.from(`:${pat}`).toString("base64");

    const res = await fetch(orgUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json-patch+json"
      },
      body: JSON.stringify(patchBody)
    });

    // Handle BOM if present
    let text = await res.text();
    // Remove any BOM (U+FEFF or others)
    text = text.replace(/^[\uFEFF\u200B\u200C\u200D\u202A-\u202E]+/, '');
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
// ...existing code...
}
}
