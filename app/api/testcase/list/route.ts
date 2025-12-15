import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { pat, orgUrl, projectName } = await req.json();
    if (!pat || !orgUrl) {
      return NextResponse.json({ error: "pat and orgUrl are required" }, { status: 400 });
    }

    const auth = Buffer.from(`:${pat}`).toString("base64");
    const base = orgUrl.replace(/\/$/, "");
    const wiqlUrl = `${base}/_apis/wit/wiql?api-version=5.0`;

    const query = {
      query: `SELECT [System.Id], [System.Title], [System.State], [Microsoft.VSTS.Common.Priority], [System.CreatedDate]
              FROM WorkItems
              WHERE [System.WorkItemType] = 'Test Case'
              ${projectName ? `AND [System.TeamProject] = '${projectName}'` : ''}
              ORDER BY [System.CreatedDate] DESC`
    };

    const wiqlRes = await fetch(wiqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    const wiqlText = await wiqlRes.text();
    let wiqlJson: any;
    try { wiqlJson = JSON.parse(wiqlText); } catch { /* keep as text */ }

    if (!wiqlRes.ok) {
      return NextResponse.json({ error: "ADO WIQL failed", details: wiqlJson ?? wiqlText }, { status: wiqlRes.status });
    }

    // If there are items, fetch details
    const items = wiqlJson?.workItems ?? [];
    if (items.length) {
      const ids = items.map((w: any) => w.id).join(",");
      const detailsUrl = `${base}/_apis/wit/workitems?ids=${ids}&api-version=5.0`;
      const detRes = await fetch(detailsUrl, {
        headers: { Authorization: `Basic ${auth}` }
      });
      const detText = await detRes.text();
      let detJson: any;
      try { detJson = JSON.parse(detText); } catch { /* keep text */ }

      if (!detRes.ok) {
        return NextResponse.json({ error: "ADO details failed", details: detJson ?? detText }, { status: detRes.status });
      }
      return NextResponse.json(detJson);
    }

    return NextResponse.json({ value: [] });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
