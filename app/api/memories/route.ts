import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { analyzeMemory } from "@/lib/analysis";
import { getDb } from "@/lib/db";
import type { MemoryReport, MemoryReportDocument } from "@/lib/types";

export const runtime = "nodejs";

function toMemoryReport(document: MemoryReportDocument & { _id: ObjectId }): MemoryReport {
  return {
    id: document._id.toString(),
    participantCode: document.participantCode,
    title: document.title,
    narrative: document.narrative,
    analysis: document.analysis,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const participantCode = searchParams.get("participantCode")?.trim();
    const filter: Record<string, unknown> = {};

    if (query) filter.$text = { $search: query };
    if (participantCode) filter.participantCode = participantCode;

    const db = await getDb();
    const documents = await db
      .collection<MemoryReportDocument>("memory_reports")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ memories: documents.map(toMemoryReport) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load memories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const participantCode = String(body.participantCode || "anonymous").trim();
    const narrative = String(body.narrative || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (narrative.length < 80) {
      return NextResponse.json({ error: "Narrative must be at least 80 characters for meaningful coding." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const document: MemoryReportDocument = {
      title,
      participantCode,
      narrative,
      analysis: analyzeMemory(narrative),
      createdAt: now,
      updatedAt: now
    };

    const db = await getDb();
    const result = await db.collection<MemoryReportDocument>("memory_reports").insertOne(document);

    return NextResponse.json({ memory: toMemoryReport({ ...document, _id: result.insertedId }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze memory." }, { status: 500 });
  }
}
