# 🤖 RecruitAI

Sistema end-to-end de análisis automático de CVs con inteligencia artificial. Un reclutador puede publicar ofertas, recibir candidaturas (manualmente o por email) y obtener un ranking de candidatos evaluado por IA, con score, sub-scores por criterio y justificación.

> Proyecto full-stack: **Angular 22** (frontend) + **FastAPI** (backend) + **n8n** (orquestación) + **Claude Sonnet** (análisis con IA).

---

## 🏗️ Arquitectura

```
┌─────────────┐     HTTP      ┌─────────────┐    Webhook    ┌──────────┐
│   Angular   │ ────────────► │   FastAPI   │ ────────────► │   n8n    │
│  (frontend) │ ◄──────────── │  (backend)  │ ◄──────────── │ workflow │
└─────────────┘   ranking     └─────────────┘    ranking    └────┬─────┘
                                     │                            │
                                     ▼                            ▼
                              ofertas.json              API Claude Sonnet
                              historial.json            (análisis de CVs)
```

- **Angular** muestra la interfaz: subida de CVs, gestión de ofertas, portal público y gráficas.
- **FastAPI** gestiona los datos (ofertas, historial) y reenvía los CVs a n8n.
- **n8n** ejecuta el análisis: extrae el texto del PDF, detecta si es texto o imagen, y llama a Claude.
- **Claude Sonnet** evalúa cada CV contra la oferta y devuelve un JSON estructurado.

---

## ✨ Funcionalidades

- 📄 Análisis de CVs en PDF (texto plano y diseño visual, con fallback a Claude Vision)
- 📊 Scoring 0-100 con sub-scores: stack técnico, sector, experiencia, ubicación, certificaciones
- 📋 Gestión de ofertas (CRUD) con códigos autogenerados (OFERTA-001...)
- 🌐 Portal público de ofertas con instrucciones para candidatos
- 📧 Recepción automática de candidaturas por email (workflow n8n con IMAP)
- 📈 Gráficas interactivas: ranking, radar de sub-scores, skills
- 🔄 Pipeline de reclutamiento con estados (Nuevo → Entrevista → Contratado...)

---

## 🛠️ Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| Frontend | Angular 22, TypeScript, ng2-charts (Chart.js) |
| Backend | FastAPI, Python, httpx, Pydantic |
| Orquestación | n8n (self-hosted en Docker) |
| IA | Claude Sonnet (Anthropic API) |
| Infraestructura | Docker, servidor cloud |

---

## 🚀 Puesta en marcha

### Requisitos previos
- Node.js 20+ y Angular CLI
- Python 3.10+
- Una instancia de n8n con el workflow importado (ver carpeta `n8n/`)

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Configura el .env con la URL de tu n8n
copy .env.example .env       # Windows
# cp .env.example .env        # Linux/Mac
# Edita .env y pon tu N8N_WEBHOOK_URL

uvicorn main:app --reload
```

El backend arranca en `http://localhost:8000` (documentación en `/docs`).

### 2. Frontend (Angular)

```bash
cd frontend
npm install
ng serve
```

El frontend arranca en `http://localhost:4200`.

### 3. n8n

Importa el workflow `n8n/RecruitAI.json` en tu instancia de n8n y configúralo con tus credenciales de Anthropic.

---

## 📁 Estructura del proyecto

```
recruitai/
├── frontend/          # Aplicación Angular
│   └── src/app/
│       ├── components/   # analisis, ofertas, portal
│       ├── services/     # api.service.ts
│       └── models/       # interfaces TypeScript
│
├── backend/           # API FastAPI
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
└── n8n/               # Workflow exportado
    └── RecruitAI.json
```

---

## 🔒 Nota sobre seguridad

Este repositorio no contiene claves API ni datos sensibles. La clave de Anthropic se gestiona dentro de n8n (no en el código), y la URL del servidor se configura mediante variables de entorno (`.env`, no versionado).

---

## 📝 Licencia

Proyecto desarrollado con fines educativos y de portfolio.
