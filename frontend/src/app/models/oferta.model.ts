// oferta.model.ts
// Interface que representa una oferta de trabajo.

export interface Oferta {
  codigo?: string;
  titulo: string;
  empresa: string;
  ubicacion: string;
  modalidad: string;
  salario: string;
  descripcion: string;
  activa: boolean;
  fecha_creacion?: string;
}

// Modalidades de trabajo disponibles
export const MODALIDADES = ['Presencial', 'Híbrido', 'Remoto'] as const;

// Respuesta del backend al analizar CVs
export interface RespuestaAnalisis {
  mensaje: string;
  ranking: any[];
  guardados: number;
}
