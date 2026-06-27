// candidato.model.ts
// Interface que representa un candidato analizado por la IA.

export interface SubScores {
  stack_tecnico: number;
  sector: number;
  experiencia: number;
  ubicacion: number;
  certificaciones: number;
}

export interface Candidato {
  cvFileName: string;
  nombre_candidato: string | null;
  categoria_profesional: string;
  anos_experiencia_total: number;
  anos_experiencia_data: number;
  num_empresas_trabajadas: number;
  ubicacion_actual: string | null;
  sectores: string[];
  skills_tecnicas: string[];
  certificaciones: string[];
  score_match: number;
  sub_scores?: SubScores;
  justificacion: string;

  // Campos añadidos por el backend / pipeline
  oferta?: string;
  estado?: string;
  email_contacto?: string | null;
}

// Estados posibles del pipeline de reclutamiento
export const ESTADOS = [
  '⚪ Nuevo',
  '👁️ Revisado',
  '📞 Entrevista',
  '💼 Oferta',
  '✅ Contratado',
  '❌ Descartado',
] as const;

export type Estado = typeof ESTADOS[number];
