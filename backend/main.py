"""
RecruitAI — Backend API (FastAPI)
==================================
API REST que gestiona ofertas, historial de candidatos y el análisis de CVs.
Actúa de intermediario entre el frontend Angular y el workflow de n8n.

Responsabilidades:
- Servir y persistir ofertas.json e historial_candidatos.json
- Reenviar los PDFs a n8n para su análisis con Claude
- Mantener la API key y la URL de n8n seguras en el servidor (no en el navegador)
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Configuración ────────────────────────────────────────────
load_dotenv()

WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/recruitai")
DATA_DIR    = Path(__file__).parent / "data"
HISTORIAL   = DATA_DIR / "historial_candidatos.json"
OFERTAS     = DATA_DIR / "ofertas.json"

# Crea la carpeta de datos si no existe
DATA_DIR.mkdir(exist_ok=True)

ESTADOS = ["⚪ Nuevo", "👁️ Revisado", "📞 Entrevista", "💼 Oferta",
           "✅ Contratado", "❌ Descartado"]

# ── App ──────────────────────────────────────────────────────
app = FastAPI(
    title="RecruitAI API",
    description="API de análisis de CVs con IA",
    version="1.0.0",
)

# CORS: permite que Angular (otro puerto) llame a esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # en producción: ["http://localhost:4200", "https://tudominio.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos (validación con Pydantic) ────────────────────────

class Oferta(BaseModel):
    """Modelo de una oferta de trabajo."""
    codigo: Optional[str] = None
    titulo: str
    empresa: str = ""
    ubicacion: str = ""
    modalidad: str = "Híbrido"
    salario: str = ""
    descripcion: str
    activa: bool = True
    fecha_creacion: Optional[str] = None


class EstadoUpdate(BaseModel):
    """Modelo para actualizar el estado de un candidato en el pipeline."""
    oferta: str
    cvFileName: str
    estado: str


# ── Funciones auxiliares de persistencia ─────────────────────

def leer_json(path: Path) -> list:
    """Lee un archivo JSON. Devuelve lista vacía si no existe."""
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []


def escribir_json(path: Path, data: list):
    """Escribe datos en un archivo JSON."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generar_codigo(ofertas: list) -> str:
    """Genera el siguiente código de oferta: OFERTA-001, OFERTA-002..."""
    if not ofertas:
        return "OFERTA-001"
    nums = []
    for o in ofertas:
        try:
            nums.append(int(o.get("codigo", "OFERTA-000").split("-")[1]))
        except (IndexError, ValueError):
            pass
    return f"OFERTA-{(max(nums) + 1):03d}" if nums else "OFERTA-001"


# ── Endpoints raíz ───────────────────────────────────────────

@app.get("/")
def root():
    """Endpoint de salud para comprobar que la API está activa."""
    return {
        "status": "ok",
        "service": "RecruitAI API",
        "version": "1.0.0",
        "endpoints": ["/ofertas", "/historial", "/analizar"],
    }


# ── Endpoints de Ofertas ─────────────────────────────────────

@app.get("/ofertas")
def listar_ofertas():
    """Devuelve todas las ofertas."""
    return leer_json(OFERTAS)


@app.get("/ofertas/activas")
def listar_ofertas_activas():
    """Devuelve solo las ofertas publicadas (activas)."""
    return [o for o in leer_json(OFERTAS) if o.get("activa")]


@app.post("/ofertas")
def crear_oferta(oferta: Oferta):
    """Crea una nueva oferta con código autogenerado."""
    ofertas = leer_json(OFERTAS)

    nueva = oferta.dict()
    nueva["codigo"] = generar_codigo(ofertas)
    nueva["fecha_creacion"] = datetime.now().strftime("%d/%m/%Y")

    ofertas.append(nueva)
    escribir_json(OFERTAS, ofertas)
    return {"mensaje": "Oferta creada", "oferta": nueva}


@app.put("/ofertas/{codigo}")
def actualizar_oferta(codigo: str, oferta: Oferta):
    """Actualiza una oferta existente por su código."""
    ofertas = leer_json(OFERTAS)

    for i, o in enumerate(ofertas):
        if o.get("codigo") == codigo:
            actualizada = oferta.dict()
            actualizada["codigo"] = codigo  # mantenemos el código original
            actualizada["fecha_creacion"] = o.get("fecha_creacion")
            ofertas[i] = actualizada
            escribir_json(OFERTAS, ofertas)
            return {"mensaje": "Oferta actualizada", "oferta": actualizada}

    raise HTTPException(status_code=404, detail=f"Oferta {codigo} no encontrada")


@app.delete("/ofertas/{codigo}")
def borrar_oferta(codigo: str):
    """Borra una oferta por su código."""
    ofertas = leer_json(OFERTAS)
    ofertas_filtradas = [o for o in ofertas if o.get("codigo") != codigo]

    if len(ofertas_filtradas) == len(ofertas):
        raise HTTPException(status_code=404, detail=f"Oferta {codigo} no encontrada")

    escribir_json(OFERTAS, ofertas_filtradas)
    return {"mensaje": f"Oferta {codigo} borrada"}


# ── Endpoints de Historial ───────────────────────────────────

@app.get("/historial")
def obtener_historial():
    """Devuelve todos los candidatos analizados."""
    historial = leer_json(HISTORIAL)
    # Aseguramos que todos tienen estado
    for c in historial:
        c.setdefault("estado", "⚪ Nuevo")
    return historial


@app.put("/historial/estado")
def actualizar_estado(update: EstadoUpdate):
    """Actualiza el estado de un candidato en el pipeline."""
    if update.estado not in ESTADOS:
        raise HTTPException(status_code=400, detail="Estado no válido")

    historial = leer_json(HISTORIAL)
    encontrado = False

    for c in historial:
        if (c.get("oferta") == update.oferta and
                c.get("cvFileName") == update.cvFileName):
            c["estado"] = update.estado
            encontrado = True
            break

    if not encontrado:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    escribir_json(HISTORIAL, historial)
    return {"mensaje": "Estado actualizado"}


@app.delete("/historial")
def limpiar_historial():
    """Borra todo el historial de candidatos."""
    escribir_json(HISTORIAL, [])
    return {"mensaje": "Historial limpiado"}


# ── Endpoint de Análisis ─────────────────────────────────────

@app.post("/analizar")
async def analizar_cvs(
    cvs: list[UploadFile] = File(...),
    offer: Optional[UploadFile] = File(None),
    offer_text: Optional[str] = Form(None),
    nombre_oferta: Optional[str] = Form(None),
):
    """
    Analiza uno o varios CVs contra una oferta.
    La oferta puede venir como PDF (offer) o como texto (offer_text).
    Reenvía los archivos a n8n y devuelve el ranking.
    """
    if not offer and not offer_text:
        raise HTTPException(
            status_code=400,
            detail="Debes enviar una oferta (PDF o texto)."
        )

    # Construimos el multipart para n8n
    files = []

    if offer:
        contenido_oferta = await offer.read()
        files.append(("offer", (offer.filename, contenido_oferta, "application/pdf")))
        nombre = offer.filename
    else:
        files.append(("offer_text", (None, offer_text)))
        nombre = nombre_oferta or "Oferta publicada"

    for cv in cvs:
        contenido = await cv.read()
        files.append(("cvs", (cv.filename, contenido, "application/pdf")))

    # Llamada a n8n
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(WEBHOOK_URL, files=files)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="n8n tardó demasiado en responder.")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="No se pudo conectar con n8n.")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"n8n devolvió error {resp.status_code}")

    if not resp.text:
        raise HTTPException(status_code=502, detail="n8n no devolvió respuesta.")

    try:
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f"Respuesta inesperada de n8n: {resp.text[:200]}")

    ranking_nuevo = data.get("ranking", [])
    if not ranking_nuevo:
        raise HTTPException(status_code=502, detail="n8n no devolvió candidatos.")

    # Etiquetamos cada candidato y guardamos en el historial
    for c in ranking_nuevo:
        c["oferta"] = nombre
        c["estado"] = "⚪ Nuevo"

    historial = leer_json(HISTORIAL)

    # Evitamos duplicados por (oferta, cvFileName)
    ya_existentes = {(c.get("oferta"), c.get("cvFileName")) for c in historial}
    nuevos = [c for c in ranking_nuevo
              if (c.get("oferta"), c.get("cvFileName")) not in ya_existentes]

    historial.extend(nuevos)
    escribir_json(HISTORIAL, historial)

    return {
        "mensaje": f"{len(nuevos)} candidato(s) analizados",
        "ranking": ranking_nuevo,
        "guardados": len(nuevos),
    }


# ── Arranque (para desarrollo) ───────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
