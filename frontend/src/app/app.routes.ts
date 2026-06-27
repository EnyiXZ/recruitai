// app.routes.ts
// Rutas de la aplicación: las 3 secciones principales.

import { Routes } from '@angular/router';

import { AnalisisComponent } from './components/analisis/analisis.component';
import { OfertasComponent } from './components/ofertas/ofertas.component';
import { PortalComponent } from './components/portal/portal.component';

export const routes: Routes = [
  { path: '', redirectTo: 'analisis', pathMatch: 'full' },
  { path: 'analisis', component: AnalisisComponent },
  { path: 'ofertas', component: OfertasComponent },
  { path: 'portal', component: PortalComponent },
  { path: '**', redirectTo: 'analisis' }, // cualquier ruta desconocida
];
