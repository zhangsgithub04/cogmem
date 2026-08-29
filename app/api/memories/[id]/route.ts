import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { MemoryReport, MemoryReportDocument } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid memory id." }, { status: 400 });
    }

    const db = await getDb();
    const document = await db.collection<MemoryReportDocument>("memory_reports").findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json({ error: "Memory report not found." }, { status: 404 });
    }

    return NextResponse.json({ memory: toMemoryReport(document) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load memory." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid memory id." }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection<MemoryReportDocument>("memory_reports").deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Memory report not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete memory." }, { status: 500 });
  }
}
