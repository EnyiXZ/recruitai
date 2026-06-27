// analisis.component.ts
// Pestaña principal: subir oferta + CVs, lanzar análisis y mostrar el ranking.

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

import { ApiService } from '../../services/api.service';
import { Candidato, ESTADOS } from '../../models/candidato.model';
import { Oferta } from '../../models/oferta.model';

@Component({
  selector: 'app-analisis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './analisis.component.html',
  styleUrl: './analisis.component.css',
})
export class AnalisisComponent implements OnInit {
  // Estado del componente con signals (Angular moderno)
  cvFiles = signal<File[]>([]);
  ofertaFile = signal<File | null>(null);
  ofertasActivas = signal<Oferta[]>([]);
  ofertaSeleccionada = signal<Oferta | null>(null);
  historial = signal<Candidato[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<{ tipo: string; texto: string } | null>(null);

  // Filtros
  filtroScoreMin = signal<number>(0);
  filtroBusqueda = signal<string>('');
  ofertaVista = signal<string>('');

  // Tab activa de visualización
  tabActiva = signal<'ranking' | 'radar' | 'skills'>('ranking');

  estados = ESTADOS;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarHistorial();
    this.cargarOfertasActivas();
  }

  // ── Carga de datos ─────────────────────────────────────────

  cargarHistorial(): void {
    this.api.getHistorial().subscribe({
      next: (data) => this.historial.set(data),
      error: () => this.mostrarMensaje('error', 'No se pudo cargar el historial.'),
    });
  }

  cargarOfertasActivas(): void {
    this.api.getOfertasActivas().subscribe({
      next: (data) => this.ofertasActivas.set(data),
      error: () => {},
    });
  }

  // ── Gestión de archivos ────────────────────────────────────

  onOfertaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.ofertaFile.set(input.files[0]);
    }
  }

  onCVsSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.cvFiles.set(Array.from(input.files));
    }
  }

  quitarCV(index: number): void {
    const actuales = [...this.cvFiles()];
    actuales.splice(index, 1);
    this.cvFiles.set(actuales);
  }

  seleccionarOfertaPublicada(codigo: string): void {
    const oferta = this.ofertasActivas().find((o) => o.codigo === codigo) || null;
    this.ofertaSeleccionada.set(oferta);
  }

  // ── Análisis ───────────────────────────────────────────────

  analizar(): void {
    const oferta = this.ofertaFile();
    const ofertaPub = this.ofertaSeleccionada();

    if (!oferta && !ofertaPub) {
      this.mostrarMensaje('error', '⚠️ Sube una oferta o selecciona una publicada.');
      return;
    }
    if (this.cvFiles().length === 0) {
      this.mostrarMensaje('error', '⚠️ Sube al menos un CV.');
      return;
    }

    this.cargando.set(true);
    this.mensaje.set(null);

    this.api
      .analizarCVs(
        this.cvFiles(),
        oferta,
        ofertaPub ? ofertaPub.descripcion : null,
        ofertaPub ? ofertaPub.titulo : null
      )
      .subscribe({
        next: (resp) => {
          this.cargando.set(false);
          this.mostrarMensaje('exito', `✅ ${resp.guardados} candidato(s) analizados.`);
          this.cargarHistorial();
          this.cvFiles.set([]);
          this.ofertaFile.set(null);
        },
        error: (err) => {
          this.cargando.set(false);
          const detalle = err.error?.detail || 'Error desconocido';
          this.mostrarMensaje('error', `❌ ${detalle}`);
        },
      });
  }

  // ── Pipeline ───────────────────────────────────────────────

  cambiarEstado(candidato: Candidato, nuevoEstado: string): void {
    if (!candidato.oferta) return;
    this.api
      .actualizarEstado(candidato.oferta, candidato.cvFileName, nuevoEstado)
      .subscribe({
        next: () => {
          candidato.estado = nuevoEstado;
          this.historial.set([...this.historial()]);
        },
      });
  }

  limpiarHistorial(): void {
    if (!confirm('¿Seguro que quieres borrar todo el historial?')) return;
    this.api.limpiarHistorial().subscribe({
      next: () => {
        this.historial.set([]);
        this.mostrarMensaje('exito', 'Historial limpiado.');
      },
    });
  }

  // ── Computed: candidatos filtrados ─────────────────────────

  ofertasEnHistorial = computed(() => {
    const ofertas = new Set(this.historial().map((c) => c.oferta || '—'));
    return Array.from(ofertas).sort();
  });

  candidatosFiltrados = computed(() => {
    let lista = this.historial();

    // Filtro por oferta seleccionada en la vista
    if (this.ofertaVista()) {
      lista = lista.filter((c) => c.oferta === this.ofertaVista());
    }

    // Filtro por score mínimo
    lista = lista.filter((c) => (c.score_match || 0) >= this.filtroScoreMin());

    // Filtro por búsqueda
    const busqueda = this.filtroBusqueda().toLowerCase();
    if (busqueda) {
      lista = lista.filter(
        (c) =>
          (c.nombre_candidato || '').toLowerCase().includes(busqueda) ||
          (c.skills_tecnicas || []).some((s) => s.toLowerCase().includes(busqueda))
      );
    }

    // Ordenar por score descendente
    return [...lista].sort((a, b) => (b.score_match || 0) - (a.score_match || 0));
  });

  // ── Métricas ───────────────────────────────────────────────

  scoreMaximo = computed(() => {
    const lista = this.candidatosFiltrados();
    return lista.length ? Math.max(...lista.map((c) => c.score_match || 0)) : 0;
  });

  scoreMedio = computed(() => {
    const lista = this.candidatosFiltrados();
    if (!lista.length) return 0;
    const suma = lista.reduce((acc, c) => acc + (c.score_match || 0), 0);
    return Math.round(suma / lista.length);
  });

  // ── Datos para gráficas ────────────────────────────────────

  rankingChartData = computed<ChartData<'bar'>>(() => {
    const lista = this.candidatosFiltrados();
    return {
      labels: lista.map((c) => c.nombre_candidato || c.cvFileName),
      datasets: [
        {
          label: 'Score',
          data: lista.map((c) => c.score_match || 0),
          backgroundColor: '#60a5fa',
        },
      ],
    };
  });

  rankingChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#e2e8f0' }, grid: { color: '#334155' } },
    },
    plugins: { legend: { labels: { color: '#e2e8f0' } } },
  };

  radarChartData = computed<ChartData<'radar'>>(() => {
    const lista = this.candidatosFiltrados().slice(0, 5); // máximo 5 para legibilidad
    const colores = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#fb7185'];

    return {
      labels: ['Stack técnico', 'Sector', 'Experiencia', 'Ubicación', 'Certificaciones'],
      datasets: lista.map((c, i) => {
        const s = c.sub_scores;
        return {
          label: c.nombre_candidato || c.cvFileName,
          data: s
            ? [
                (s.stack_tecnico / 40) * 100,
                (s.sector / 20) * 100,
                (s.experiencia / 20) * 100,
                (s.ubicacion / 10) * 100,
                (s.certificaciones / 10) * 100,
              ]
            : [0, 0, 0, 0, 0],
          backgroundColor: colores[i % 5] + '40',
          borderColor: colores[i % 5],
          pointBackgroundColor: colores[i % 5],
        };
      }),
    };
  });

  radarChartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { color: '#94a3b8', backdropColor: 'transparent' },
        grid: { color: '#334155' },
        angleLines: { color: '#334155' },
        pointLabels: { color: '#cbd5e1' },
      },
    },
    plugins: { legend: { labels: { color: '#e2e8f0' } } },
  };

  skillsChartData = computed<ChartData<'bar'>>(() => {
    const lista = this.candidatosFiltrados();
    return {
      labels: lista.map((c) => c.nombre_candidato || c.cvFileName),
      datasets: [
        {
          label: 'Skills técnicas',
          data: lista.map((c) => (c.skills_tecnicas || []).length),
          backgroundColor: '#60a5fa',
        },
        {
          label: 'Certificaciones',
          data: lista.map((c) => (c.certificaciones || []).length),
          backgroundColor: '#34d399',
        },
      ],
    };
  });

  skillsChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: '#e2e8f0' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
    },
    plugins: { legend: { labels: { color: '#e2e8f0' } } },
  };

  // ── Utilidades ─────────────────────────────────────────────

  iconoScore(score: number): string {
    if (score >= 80) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  }

  private mostrarMensaje(tipo: string, texto: string): void {
    this.mensaje.set({ tipo, texto });
    setTimeout(() => this.mensaje.set(null), 5000);
  }
}
