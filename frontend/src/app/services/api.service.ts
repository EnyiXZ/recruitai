// api.service.ts
// Servicio centralizado para todas las llamadas HTTP al backend FastAPI.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Candidato } from '../models/candidato.model';
import { Oferta, RespuestaAnalisis } from '../models/oferta.model';

@Injectable({
  providedIn: 'root', // singleton disponible en toda la app
})
export class ApiService {
  // URL base del backend FastAPI. En producción se cambia por la del servidor.
  private readonly API_URL = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  // ── Ofertas ────────────────────────────────────────────────

  /** Devuelve todas las ofertas. */
  getOfertas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.API_URL}/ofertas`);
  }

  /** Devuelve solo las ofertas publicadas (activas). */
  getOfertasActivas(): Observable<Oferta[]> {
    return this.http.get<Oferta[]>(`${this.API_URL}/ofertas/activas`);
  }

  /** Crea una nueva oferta. */
  crearOferta(oferta: Oferta): Observable<any> {
    return this.http.post(`${this.API_URL}/ofertas`, oferta);
  }

  /** Actualiza una oferta existente por su código. */
  actualizarOferta(codigo: string, oferta: Oferta): Observable<any> {
    return this.http.put(`${this.API_URL}/ofertas/${codigo}`, oferta);
  }

  /** Borra una oferta por su código. */
  borrarOferta(codigo: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/ofertas/${codigo}`);
  }

  // ── Historial ──────────────────────────────────────────────

  /** Devuelve todos los candidatos analizados. */
  getHistorial(): Observable<Candidato[]> {
    return this.http.get<Candidato[]>(`${this.API_URL}/historial`);
  }

  /** Actualiza el estado de un candidato en el pipeline. */
  actualizarEstado(oferta: string, cvFileName: string, estado: string): Observable<any> {
    return this.http.put(`${this.API_URL}/historial/estado`, {
      oferta,
      cvFileName,
      estado,
    });
  }

  /** Limpia todo el historial. */
  limpiarHistorial(): Observable<any> {
    return this.http.delete(`${this.API_URL}/historial`);
  }

  // ── Análisis ───────────────────────────────────────────────

  /**
   * Envía los CVs y la oferta al backend para su análisis.
   * La oferta puede venir como PDF (offerFile) o como texto (offerText).
   */
  analizarCVs(
    cvs: File[],
    offerFile: File | null,
    offerText: string | null,
    nombreOferta: string | null
  ): Observable<RespuestaAnalisis> {
    const formData = new FormData();

    // Añadimos cada CV
    cvs.forEach((cv) => formData.append('cvs', cv, cv.name));

    // Oferta: PDF o texto
    if (offerFile) {
      formData.append('offer', offerFile, offerFile.name);
    } else if (offerText) {
      formData.append('offer_text', offerText);
      if (nombreOferta) {
        formData.append('nombre_oferta', nombreOferta);
      }
    }

    return this.http.post<RespuestaAnalisis>(`${this.API_URL}/analizar`, formData);
  }
}
