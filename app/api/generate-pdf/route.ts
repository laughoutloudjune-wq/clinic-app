import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("scanId");
  if (!scanId || !uuidPattern.test(scanId)) {
    return NextResponse.json({ error: "scanId must be a valid UUID." }, { status: 400 });
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredAppUrl && configuredAppUrl.length > 0 ? configuredAppUrl : request.nextUrl.origin;
  const reportUrl = `${baseUrl}/report/${scanId}?pdf=1`;
  const cookieHeader = request.headers.get("cookie");
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  let browser: {
    close: () => Promise<void>;
    newPage: () => Promise<{
      goto: (url: string, options: { waitUntil: "networkidle0"; timeout: number }) => Promise<unknown>;
      setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<unknown>;
      url: () => string;
      emulateMediaType: (type: "print") => Promise<unknown>;
      pdf: (options: {
        format: "A4";
        printBackground: boolean;
        margin: { top: string; right: string; bottom: string; left: string };
      }) => Promise<Uint8Array>;
    }>;
  } | null = null;
  try {
    if (process.env.VERCEL) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const puppeteer = await import("puppeteer-core");

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    if (!browser) {
      throw new Error("Browser launch failed.");
    }

    const page = await browser.newPage();
    const extraHeaders: Record<string, string> = {};
    if (cookieHeader) extraHeaders.cookie = cookieHeader;
    if (protectionBypass) extraHeaders["x-vercel-protection-bypass"] = protectionBypass;
    if (Object.keys(extraHeaders).length > 0) {
      await page.setExtraHTTPHeaders(extraHeaders);
    }
    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 90_000 });
    const currentUrl = page.url();
    if (currentUrl.includes("vercel.com/login") || currentUrl.includes("auth")) {
      throw new Error("PDF generator reached an authentication page instead of the report.");
    }
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
