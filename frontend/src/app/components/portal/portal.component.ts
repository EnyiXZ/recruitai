// portal.component.ts
// Pestaña pública: muestra las ofertas activas con instrucciones para aplicar.

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../services/api.service';
import { Oferta } from '../../models/oferta.model';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.css',
})
export class PortalComponent implements OnInit {
  ofertas = signal<Oferta[]>([]);
  expandida = signal<string | null>(null);

  // Email al que los candidatos envían su CV
  readonly EMAIL = 'recruitai.analisis@gmail.com';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getOfertasActivas().subscribe({
      next: (data) => this.ofertas.set(data),
    });
  }

  toggleDescripcion(codigo: string): void {
    this.expandida.set(this.expandida() === codigo ? null : codigo);
  }
}
