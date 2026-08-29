export type EvidenceItem = {
  construct: string;
  evidence: string[];
  representation: string;
  confidence: number;
};

export type EmotionPhase = {
  phase: string;
  emotion: string;
  intensity: number;
  evidence: string;
};

export type ConstructScore = {
  name: string;
  score: number;
  rationale: string;
  evidenceConstructs: string[];
};

export type MemoryAnalysis = {
  evidenceLayer: EvidenceItem[];
  emotionTrajectory: EmotionPhase[];
  narrativeOrganization: string[];
  socialCognition: string[];
  retrievalCues: string[];
  constructScores: ConstructScore[];
  interpretations: string[];
  hypotheses: string[];
  methodologicalWarnings: string[];
};

export type MemoryReport = {
  id: string;
  participantCode: string;
  title: string;
  narrative: string;
  analysis: MemoryAnalysis;
  createdAt: string;
  updatedAt: string;
};

export type MemoryReportDocument = Omit<MemoryReport, "id">;
