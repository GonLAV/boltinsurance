import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { pat } = await req.json();

    if (!pat) {
      return NextResponse.json(
        { error: "PAT is required" },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`:${pat}`).toString("base64");

    const adoRes = await fetch(
      "https://dev.azure.com/YOUR_ORG/_apis/projects?api-version=5.0",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    if (!adoRes.ok) {
      return NextResponse.json(
        { error: "Invalid PAT or missing permissions" },
        { status: 401 }
      );
    }

    // TODO: store PAT securely (session / cookie / vault)
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
