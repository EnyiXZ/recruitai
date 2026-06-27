// ofertas.component.ts
// Pestaña de gestión de ofertas: crear, editar, borrar.

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import { Oferta, MODALIDADES } from '../../models/oferta.model';

@Component({
  selector: 'app-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ofertas.component.html',
  styleUrl: './ofertas.component.css',
})
export class OfertasComponent implements OnInit {
  ofertas = signal<Oferta[]>([]);
  modalidades = MODALIDADES;
  editandoCodigo = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  // Formulario
  form = signal<Oferta>(this.ofertaVacia());

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarOfertas();
  }

  ofertaVacia(): Oferta {
    return {
      titulo: '',
      empresa: '',
      ubicacion: '',
      modalidad: 'Híbrido',
      salario: '',
      descripcion: '',
      activa: true,
    };
  }

  cargarOfertas(): void {
    this.api.getOfertas().subscribe({
      next: (data) => this.ofertas.set(data),
    });
  }

  guardar(): void {
    const oferta = this.form();
    if (!oferta.titulo || !oferta.descripcion) {
      this.mostrarMensaje('⚠️ El título y la descripción son obligatorios.');
      return;
    }

    const codigo = this.editandoCodigo();
    if (codigo) {
      // Actualizar
      this.api.actualizarOferta(codigo, oferta).subscribe({
        next: () => {
          this.mostrarMensaje(`✅ Oferta ${codigo} actualizada.`);
          this.cancelar();
          this.cargarOfertas();
        },
      });
    } else {
      // Crear
      this.api.crearOferta(oferta).subscribe({
        next: (resp) => {
          this.mostrarMensaje(`✅ Oferta ${resp.oferta.codigo} creada.`);
          this.form.set(this.ofertaVacia());
          this.cargarOfertas();
        },
      });
    }
  }

  editar(oferta: Oferta): void {
    this.form.set({ ...oferta });
    this.editandoCodigo.set(oferta.codigo || null);
  }

  cancelar(): void {
    this.form.set(this.ofertaVacia());
    this.editandoCodigo.set(null);
  }

  borrar(codigo: string): void {
    if (!confirm(`¿Borrar la oferta ${codigo}?`)) return;
    this.api.borrarOferta(codigo).subscribe({
      next: () => {
        this.mostrarMensaje(`Oferta ${codigo} borrada.`);
        this.cargarOfertas();
      },
    });
  }

  // Helpers para actualizar campos del form signal
  actualizarCampo(campo: keyof Oferta, valor: any): void {
    this.form.set({ ...this.form(), [campo]: valor });
  }

  private mostrarMensaje(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => this.mensaje.set(null), 4000);
  }
}
