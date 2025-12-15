import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cases = await req.json(); // Array of patch objects
    const pat = process.env.AZURE_DEVOPS_PAT!;
    const orgName = process.env.AZURE_DEVOPS_ORG!;
    const projectName = process.env.AZURE_DEVOPS_PROJECT!;
    const orgUrl = `https://tlvtfs03.ciosus.com/tfs/${projectName}/_apis/wit/workitems/$Test%20Case?api-version=5.0`;
    const auth = Buffer.from(`:${pat}`).toString("base64");

    const results = [];
    for (const patchBody of cases) {
      const res = await fetch(orgUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json-patch+json"
        },
        body: JSON.stringify(patchBody)
      });

      let text = await res.text();
      text = text.replace(/^\uFEFF/, '');
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      results.push({ status: res.status, data });
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
