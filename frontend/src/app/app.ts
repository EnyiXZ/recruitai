import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-container">
      <header class="header">
        <h1 class="logo">🤖 RecruitAI</h1>
        <nav class="nav">
          <a routerLink="/analisis" routerLinkActive="active" class="nav-link">🔍 Análisis de CVs</a>
          <a routerLink="/ofertas" routerLinkActive="active" class="nav-link">📋 Gestión de Ofertas</a>
          <a routerLink="/portal" routerLinkActive="active" class="nav-link">🌐 Portal Candidatos</a>
        </nav>
      </header>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container { min-height: 100vh; background: #0f172a; color: #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 1.5rem 2rem; border-bottom: 1px solid #334155; }
    .logo { font-size: 1.8rem; margin: 0 0 1rem 0; color: #f1f5f9; }
    .nav { display: flex; gap: 0.5rem; }
    .nav-link { padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; color: #94a3b8; font-weight: 500; transition: all 0.2s; }
    .nav-link:hover { background: #1e293b; color: #e2e8f0; }
    .nav-link.active { background: #3b82f6; color: white; }
    .content { padding: 2rem; max-width: 1400px; margin: 0 auto; }
  `],
})
export class App {}
