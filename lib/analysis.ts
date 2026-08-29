import type { EvidenceItem, MemoryAnalysis } from "./types";

const emotionLexicon = {
  excitement: ["excited", "thrilled", "eager", "happy", "joy", "delighted"],
  pride: ["proud", "accomplished", "successful", "validated"],
  fear: ["afraid", "scared", "terrified", "anxious", "worried"],
  sadness: ["sad", "lonely", "grief", "crying", "upset"],
  frustration: ["frustrated", "angry", "mad", "annoyed", "wanted to leave"],
  uncertainty: ["unsure", "uncertain", "confused", "hesitated", "doubt"]
};

const sensoryTerms = ["saw", "heard", "smelled", "tasted", "felt", "sunrise", "rain", "dark", "bright", "cold", "warm", "sound", "voice"];
const socialTerms = ["mother", "father", "parent", "friend", "teacher", "sister", "brother", "grandmother", "grandfather", "partner", "classmate"];
const temporalPatterns = [/\bwhen i was\b/i, /\babout \d+\b/i, /\bbefore sunrise\b/i, /\byesterday\b/i, /\blast\s+\w+/i, /\bin \d{4}\b/i, /\bat \d{1,2}\b/i];
const spatialPatterns = [/\bat the\b/i, /\bin the\b/i, /\bnear\b/i, /\bhouse\b/i, /\bschool\b/i, /\blake\b/i, /\broom\b/i, /\bcity\b/i];

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function excerpts(text: string, terms: string[], limit = 4) {
  const units = sentences(text);
  const matches = units.filter((unit) => terms.some((term) => unit.toLowerCase().includes(term.toLowerCase())));
  return matches.slice(0, limit);
}

function patternExcerpts(text: string, patterns: RegExp[], limit = 4) {
  const units = sentences(text);
  return units.filter((unit) => patterns.some((pattern) => pattern.test(unit))).slice(0, limit);
}

function makeEvidence(construct: string, evidence: string[], representation: string, confidence = 0.74): EvidenceItem {
  return {
    construct,
    evidence,
    representation: evidence.length ? representation : "Not clearly present",
    confidence: evidence.length ? confidence : 0.35
  };
}

export function analyzeMemory(narrative: string): MemoryAnalysis {
  const lower = narrative.toLowerCase();
  const sentenceList = sentences(narrative);
  const firstPersonCount = (lower.match(/\b(i|me|my|mine|myself)\b/g) || []).length;
  const dialogue = narrative.match(/[“"][^”"]+[”"]/g) || [];
  const temporalEvidence = patternExcerpts(narrative, temporalPatterns);
  const spatialEvidence = patternExcerpts(narrative, spatialPatterns);
  const sensoryEvidence = excerpts(narrative, sensoryTerms);
  const socialEvidence = excerpts(narrative, socialTerms);
  const causalEvidence = excerpts(narrative, ["because", "so", "then", "after", "therefore", "wait", "told me"]);
  const retrievalEvidence = excerpts(narrative, ["remember", "still think", "whenever", "reminds me", "comes back"]);
  const eventSpecific = sentenceList.length >= 3 && (temporalEvidence.length > 0 || spatialEvidence.length > 0);

  const evidenceLayer = [
    makeEvidence("Event specificity", sentenceList.slice(0, 2), eventSpecific ? "Specific or bounded event" : "Possibly generic event", 0.7),
    makeEvidence("Temporal specificity", temporalEvidence, temporalEvidence.length > 1 ? "Moderately specific" : "Low to moderate specificity", 0.75),
    makeEvidence("Spatial context", spatialEvidence, "Spatial setting present", 0.75),
    makeEvidence("Sensory/contextual detail", sensoryEvidence, sensoryEvidence.length > 2 ? "Moderate to high" : "Limited to moderate", 0.7),
    makeEvidence("Emotional detail", Object.values(emotionLexicon).flatMap((terms) => excerpts(narrative, terms, 2)).slice(0, 5), "Emotion words or emotion-bearing phrases present", 0.72),
    makeEvidence("Self-reference", firstPersonCount ? [`${firstPersonCount} first-person references detected`] : [], firstPersonCount > 6 ? "High" : "Low to moderate", 0.82),
    makeEvidence("Other-person representation", socialEvidence, "Named or relational social agents present", 0.78),
    makeEvidence("Social interaction", socialEvidence.filter((item) => /told|said|smiled|helped|encouraged|asked|gave/i.test(item)), "Interactive social role present", 0.73),
    makeEvidence("Causal structure", causalEvidence, "Narrative contains cause, sequence, or obstacle-outcome links", 0.69),
    makeEvidence("Verbal dialogue", dialogue, "Quoted or reconstructed dialogue present", 0.86),
    makeEvidence("Current accessibility", retrievalEvidence, "Retrieval cue or later accessibility statement present", 0.76)
  ];

  const emotionTrajectory = Object.entries(emotionLexicon).flatMap(([emotion, terms]) =>
    excerpts(narrative, terms, 3).map((evidence, index) => ({
      phase: `Narrative phase ${Math.min(sentenceList.indexOf(evidence) + 1 || index + 1, sentenceList.length)}`,
      emotion,
      intensity: clamp(0.45 + terms.filter((term) => evidence.toLowerCase().includes(term)).length * 0.18),
      evidence
    }))
  );

  const narrativeOrganization = [
    eventSpecific ? "The account is organized around a bounded autobiographical episode." : "The account may need more event-boundary detail for strong specificity coding.",
    causalEvidence.length ? "Sequential and causal markers support an obstacle-response-outcome reading." : "Causal links are not strongly marked in the text.",
    dialogue.length ? "Dialogue anchors the event in a reconstructed social scene." : "No direct dialogue is available for dialogue-based coding."
  ];

  const socialCognition = socialEvidence.length
    ? socialEvidence.map((item) => `The report represents another person or social role through: ${item}`)
    : ["No strong other-person representation was detected from the narrative alone."];

  const retrievalCues = retrievalEvidence.length
    ? retrievalEvidence
    : ["No explicit later-retrieval cue was detected; accessibility should be measured separately."];

  const specificityScore = clamp((eventSpecific ? 0.35 : 0.1) + temporalEvidence.length * 0.12 + spatialEvidence.length * 0.12 + causalEvidence.length * 0.08);
  const selfScore = clamp(firstPersonCount / 10);
  const emotionScore = clamp(emotionTrajectory.length * 0.14 + new Set(emotionTrajectory.map((item) => item.emotion)).size * 0.12);
  const socialScore = clamp(socialEvidence.length * 0.16 + dialogue.length * 0.1);
  const retrievalScore = clamp(retrievalEvidence.length * 0.22);

  const constructScores = [
    {
      name: "Autobiographical memory specificity",
      score: specificityScore,
      rationale: "Weighted by bounded-event cues, temporal markers, spatial context, and sequence/causal markers.",
      evidenceConstructs: ["Event specificity", "Temporal specificity", "Spatial context", "Causal structure"]
    },
    {
      name: "Self-reference and agency",
      score: selfScore,
      rationale: "Estimated from first-person references and the narrator's role as an actor in the event.",
      evidenceConstructs: ["Self-reference", "Causal structure"]
    },
    {
      name: "Emotional elaboration",
      score: emotionScore,
      rationale: "Estimated from the number and diversity of emotion-bearing phases, not from global sentiment.",
      evidenceConstructs: ["Emotional detail"]
    },
    {
      name: "Social-relational organization",
      score: socialScore,
      rationale: "Estimated from represented social agents, social interaction cues, and dialogue.",
      evidenceConstructs: ["Other-person representation", "Social interaction", "Verbal dialogue"]
    },
    {
      name: "Retrieval accessibility",
      score: retrievalScore,
      rationale: "Estimated only from explicit retrieval-language evidence; participant ratings are preferable.",
      evidenceConstructs: ["Current accessibility"]
    }
  ];

  const interpretations = [
    specificityScore > 0.65
      ? "The narrative provides comparatively rich evidence for a specific autobiographical episode."
      : "The narrative would benefit from more temporal, spatial, or event-boundary detail before strong specificity claims.",
    socialScore > 0.55
      ? "The memory appears socially organized, with other people functioning as meaningful agents in the event."
      : "The memory is not strongly socially organized based on the available text.",
    emotionScore > 0.55
      ? "The emotional coding suggests a trajectory rather than a single static valence label."
      : "The text has limited explicit emotion-language evidence."
  ];

  return {
    evidenceLayer,
    emotionTrajectory,
    narrativeOrganization,
    socialCognition,
    retrievalCues,
    constructScores,
    interpretations,
    hypotheses: [
      "Human-coder agreement should be tested for each evidence construct before treating scores as measures.",
      "Participant-rated vividness, reliving, confidence, importance, and retrieval frequency should be collected as separate measurements.",
      "Cross-memory comparisons should preserve the distinction between textual evidence and psychological interpretation."
    ],
    methodologicalWarnings: [
      "Scores are operational estimates, not validated clinical or diagnostic measures.",
      "The app does not infer attachment, trauma status, or mental health condition from a single report.",
      "Interpretations should be treated as research hypotheses unless validated against independent measures."
    ]
  };
}
