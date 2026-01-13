import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  getPdfsByChatId,
  addPdfToChat,
  removePdfFromChat,
  setChatPdfs,
} from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

// GET - Get PDFs linked to a chat
export async function GET(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get("chatId");
    if (!chatId) {
      return NextResponse.json(
        { error: "Bad request: chat ID is required" },
        { status: 400 }
      );
    }

    const pdfIds = await getPdfsByChatId({ chatId });
    return NextResponse.json({ pdfIds });
  } catch (error: any) {
    console.error("Failed to get chat PDFs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add a PDF to a chat
export async function POST(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get("chatId");
    const { pdfId } = await request.json();

    if (!chatId || !pdfId) {
      return NextResponse.json(
        { error: "Bad request: chat ID and PDF ID are required" },
        { status: 400 }
      );
    }

    await addPdfToChat({ chatId, pdfId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to add PDF to chat:", error);
    if (error instanceof ChatSDKError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Set all PDFs for a chat (replace)
export async function PUT(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get("chatId");
    const { pdfIds } = await request.json();

    if (!chatId || !Array.isArray(pdfIds)) {
      return NextResponse.json(
        { error: "Bad request: chat ID and an array of PDF IDs are required" },
        { status: 400 }
      );
    }

    await setChatPdfs({ chatId, pdfIds });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to set chat PDFs:", error);
    if (error instanceof ChatSDKError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a PDF from a chat
export async function DELETE(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get("chatId");
    const { pdfId } = await request.json();

    if (!chatId || !pdfId) {
      return NextResponse.json(
        { error: "Bad request: chat ID and PDF ID are required" },
        { status: 400 }
      );
    }
    await removePdfFromChat({ chatId, pdfId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to remove PDF from chat:", error);
    if (error instanceof ChatSDKError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
