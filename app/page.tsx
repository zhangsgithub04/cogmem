"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MemoryReport } from "@/lib/types";

const exampleNarrative =
  "I was about ten when my father took me fishing at a lake near our house. I remember getting up before sunrise and feeling excited because I had never caught a fish. It started raining, and I wanted to leave. My father told me to wait. After a while I caught a small fish. I remember feeling incredibly proud when my father smiled and said, \"You did it.\" I still think about that day whenever I think about my father.";

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.ok ? "The server returned an unreadable response." : "The server hit an unexpected error."
    };
  }
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="scoreTrack" aria-label={`Score ${Math.round(value * 100)} percent`}>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export default function Home() {
  const [memories, setMemories] = useState<MemoryReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => memories.find((memory) => memory.id === selectedId) || memories[0],
    [memories, selectedId]
  );

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories(nextQuery = "") {
    setError("");
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const response = await fetch(`/api/memories${params.size ? `?${params}` : ""}`);
    const data = await readJson(response);

    if (!response.ok) {
      setError(data.error || "Could not load saved reports.");
      return;
    }

    const nextMemories = data.memories || [];
    setMemories(nextMemories);
    setSelectedId((current) => current || nextMemories[0]?.id || "");
  }

  async function submitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setBusy(true);

    const form = new FormData(formElement);
    const response = await fetch("/api/memories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        participantCode: form.get("participantCode"),
        narrative: form.get("narrative")
      })
    });
    const data = await readJson(response);
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Could not analyze the memory report.");
      return;
    }

    setMemories((current) => [data.memory, ...current]);
    setSelectedId(data.memory.id);
    formElement.reset();
  }

  async function deleteSelected() {
    if (!selected) return;
    setError("");
    const response = await fetch(`/api/memories/${selected.id}`, { method: "DELETE" });
    const data = await readJson(response);

    if (!response.ok) {
      setError(data.error || "Could not delete the report.");
      return;
    }

    setMemories((current) => current.filter((memory) => memory.id !== selected.id));
    setSelectedId("");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Research Workspace</p>
          <h1>Memory Analysis Lab</h1>
          <p className="summary">
            Code autobiographical narratives without collapsing textual evidence into psychological interpretation.
          </p>
        </div>

        <form className="search" onSubmit={(event) => {
          event.preventDefault();
          loadMemories(query);
        }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" />
          <button type="submit">Search</button>
        </form>

        <div className="history" aria-label="Saved memory reports">
          {memories.length === 0 ? (
            <p className="empty">No reports loaded yet. Add the first narrative to begin.</p>
          ) : (
            memories.map((memory) => (
              <button
                key={memory.id}
                className={memory.id === selected?.id ? "active historyItem" : "historyItem"}
                onClick={() => setSelectedId(memory.id)}
                type="button"
              >
                <span>{memory.title}</span>
                <small>{memory.participantCode}</small>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace">
        <form className="entryPanel" onSubmit={submitMemory}>
          <div className="formHeader">
            <div>
              <p className="eyebrow">New Report</p>
              <h2>Autobiographical narrative</h2>
            </div>
            <button type="submit" disabled={busy}>{busy ? "Analyzing..." : "Analyze"}</button>
          </div>

          <div className="fieldGrid">
            <label>
              Title
              <input name="title" placeholder="Fishing trip with father" required />
            </label>
            <label>
              Participant code
              <input name="participantCode" placeholder="P-001" defaultValue="P-001" />
            </label>
          </div>

          <label>
            Memory report
            <textarea name="narrative" rows={8} defaultValue={exampleNarrative} required />
          </label>
          {error ? <p className="error">{error}</p> : null}
        </form>

        {selected ? (
          <article className="analysis">
            <header className="analysisHeader">
              <div>
                <p className="eyebrow">Saved Analysis</p>
                <h2>{selected.title}</h2>
                <p>{selected.narrative}</p>
              </div>
              <button className="secondary" type="button" onClick={deleteSelected}>Delete</button>
            </header>

            <section className="scoreGrid">
              {selected.analysis.constructScores.map((score) => (
                <div className="scoreCard" key={score.name}>
                  <div className="scoreTop">
                    <h3>{score.name}</h3>
                    <strong>{Math.round(score.score * 100)}</strong>
                  </div>
                  <ScoreBar value={score.score} />
                  <p>{score.rationale}</p>
                </div>
              ))}
            </section>

            <section className="tableSection">
              <h2>Evidence Layer</h2>
              <div className="evidenceTable">
                <div className="tableHead">Construct</div>
                <div className="tableHead">Observable Evidence</div>
                <div className="tableHead">Representation</div>
                {selected.analysis.evidenceLayer.map((item) => (
                  <div className="tableRow" key={item.construct}>
                    <div>
                      <strong>{item.construct}</strong>
                      <small>{Math.round(item.confidence * 100)}% coding confidence</small>
                    </div>
                    <ul>
                      {(item.evidence.length ? item.evidence : ["No direct evidence detected"]).map((evidence) => (
                        <li key={evidence}>{evidence}</li>
                      ))}
                    </ul>
                    <p>{item.representation}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="split">
              <div>
                <h2>Emotion Trajectory</h2>
                {selected.analysis.emotionTrajectory.length ? (
                  selected.analysis.emotionTrajectory.map((phase) => (
                    <div className="phase" key={`${phase.phase}-${phase.emotion}-${phase.evidence}`}>
                      <strong>{phase.phase}: {phase.emotion}</strong>
                      <ScoreBar value={phase.intensity} />
                      <p>{phase.evidence}</p>
                    </div>
                  ))
                ) : (
                  <p className="muted">No explicit emotion trajectory detected.</p>
                )}
              </div>
              <div>
                <h2>Interpretive Layer</h2>
                <ul className="stackList">
                  {selected.analysis.interpretations.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <h2>Hypotheses</h2>
                <ul className="stackList">
                  {selected.analysis.hypotheses.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </section>

            <section className="warningBand">
              <h2>Methodological Warnings</h2>
              <ul>
                {selected.analysis.methodologicalWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          </article>
        ) : (
          <section className="analysis placeholder">
            <h2>No report selected</h2>
            <p>Submit a narrative or select a saved report to inspect the coding layers.</p>
          </section>
        )}
      </section>
    </main>
  );
}
