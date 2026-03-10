import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("scanId");
  if (!scanId || !uuidPattern.test(scanId)) {
    return NextResponse.json({ error: "scanId must be a valid UUID." }, { status: 400 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin);
  const reportUrl = `${baseUrl}/report/${scanId}?pdf=1`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 90_000 });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="body-composition-${scanId}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  } finally {
    await browser.close();
  }
}
