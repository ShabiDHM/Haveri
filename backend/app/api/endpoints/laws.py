# FILE: backend/app/api/endpoints/laws.py
# PHOENIX PROTOCOL - LEGAL KNOWLEDGE BASE (FIXED: NOW USING legal_knowledge_base)

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Set, Any
from app.services import vector_store_service, llm_service
from app.api.endpoints.dependencies import get_current_user

router = APIRouter(prefix="/laws", tags=["Laws"])

class LawExplainRequest(BaseModel):
    law_title: str
    article_number: str
    prompt: str

class AuditChatRequest(BaseModel):
    law_title: str
    article_number: str
    query: str

def _safe_int(value: Any) -> int:
    if value is None: return 0
    try: return int(value)
    except (ValueError, TypeError): return 0

def _natural_sort_key(article_any: Any) -> List[int]:
    article = str(article_any) if article_any is not None else "0"
    parts = article.split('.')
    return [int(p) for p in parts if p.isdigit()]

# ==================================================================
# RIGID AUDITOR SYSTEM PROMPT (from Phoenix Protocol)
# ==================================================================
RIGID_AUDITOR_PROMPT = """
ROLI: Ti je 'Krye-Auditori Forenzik' i certifikuar për juridiksionin e Kosovës.
DETYRA: Përgjigju pyetjeve të përdoruesit BAZUAR VETËM NË KONTEKSTIN E DHËNË.

═══════════════════════════════════════════════════════════════
RREGULLAT E DETYRUESHME (SHKELJA ËSHTË E NDALUAR):
═══════════════════════════════════════════════════════════════

1. **MOS SHPIK ASNJË LIGJ, NEN, APO DATË.**
   - Nëse konteksti nuk përmban ligjin për të cilin pyet përdoruesi, përgjigju:
     "Nuk kam informacion për këtë ligj në bazën time të të dhënave."

2. **PËR ÇDO DEKLARATË LIGJORE, CITO BURIMIN E SAKTË.**
   - Përdor fjalë për fjalë tekstin e ligjit nga konteksti.
   - Formati: "[Burimi: {emri_i_ligjit}, Neni X, Paragrafi Y]"

3. **NUMRAT DHE DATAT DUHET TË EKZISTOJNË NË KONTEKST.**
   - Nëse pyet për afat deklarimi TVSH dhe konteksti thotë "deri më 20", ti duhet të thuash "20".
   - Nëse konteksti nuk e përmend, thuaj se nuk e di.

4. **NËSE NUK JE I SIGURTË, THUAJ "NUK DI".**
   - Asnjëherë mos jep përgjigje të paverifikuara.

5. **DELEGIMI I MATEMATIKËS (I DETYRUESHËM)**
   - Nëse pyetja kërkon llogaritje matematikore (TVSH, tatim në fitim, zbritje), MOS e bëj llogaritjen ti.
   - Nëse të dhënat nuk janë të gatshme në kontekst si rezultat i llogaritur, thuaj:
     "Llogaritja kërkon përpunim nga motori tatimor, ju lutem përdorni funksionin Analisti Financiar."

6. **HIERARKIA E PRIORITETIT TË TË DHËNAVE**
   - Nëse ka konflikt mes dokumenteve të përdoruesit (fatura/ekstrakt) dhe ligjeve tatimore, raporto konfliktin.
   - Mos merr vendim financiar ti.

STILI: Shqip standard, i qartë, me pika dhe lista për lehtësi.
"""

# ==================================================================
# FIXED: AUDIT CHAT ENDPOINT - NOW USING legal_knowledge_base
# ==================================================================
@router.post("/audit-chat")
async def audit_chat(
    request: AuditChatRequest,
    current_user = Depends(get_current_user)
):
    """
    Interactive chat with the Rigid Auditor anchored to a specific law article.
    Accepts law_title and article_number, retrieves the article content, and streams AI response.
    """
    try:
        # FIXED: Use legal_knowledge_base (agent_type='legal')
        collection = vector_store_service.get_legal_kb_collection()
        
        # Retrieve all chunks for this law title and article number
        results = collection.get(
            where={"$and": [
                {"law_title": {"$eq": request.law_title}},
                {"article_number": {"$eq": request.article_number}}
            ]},
            include=["documents", "metadatas"]
        )
        
        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []
        
        if not documents:
            raise HTTPException(status_code=404, detail=f"Article not found: {request.law_title}, Neni {request.article_number}")
        
        # Sort by chunk_index if available
        if metadatas and all("chunk_index" in m for m in metadatas):
            pairs = list(zip(documents, metadatas))
            pairs.sort(key=lambda x: _safe_int(x[1].get("chunk_index")))
            documents = [d for d, _ in pairs]
        
        # Combine all chunks into full article text
        full_article_text = "\n\n".join(documents)
        
        # Get law title and article number from metadata
        first_meta = metadatas[0] if metadatas else {}
        law_title = first_meta.get("law_title", request.law_title)
        article_number = first_meta.get("article_number", request.article_number)
        
        # Build context for the auditor
        context = f"""
=== KONTEKSTI I DOKUMENTEVE ===
Titulli i Ligjit: {law_title}
Numri i Nenit: {article_number}
Përmbajtja e Nenit:
{full_article_text}
"""
        
        # Build user prompt with the query
        user_prompt = f"Pyetja e përdoruesit në lidhje me këtë nen: {request.query}"
        full_user_prompt = f"{context}\n\n{user_prompt}"
        
        generator = llm_service.stream_text_async(
            system_prompt=RIGID_AUDITOR_PROMPT,
            user_prompt=full_user_prompt,
            temp=0.0
        )
        return StreamingResponse(generator, media_type="text/plain")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit chat failed: {str(e)}")

# ----------------------------------------------------------------------
# AI EXPLANATION ENDPOINT (streaming)
# ----------------------------------------------------------------------
@router.post("/explain")
async def explain_law_article(
    request: LawExplainRequest,
    current_user = Depends(get_current_user)
):
    """
    Streams a dual‑layer AI explanation of a legal article.
    """
    system_prompt = (
        "ROLI: Ti je partneri kryesor (Senior Legal Partner) në zyrën më prestigjioze ligjore në Kosovë. "
        "Klientët paguajnë shtrenjtë për mendimin tënd analitik, jo për përmbledhje robotike.\n\n"
        "RREGULLAT ABSOLUTE:\n"
        "1. MOS përsërit asnjë nga udhëzimet e mia në përgjigjen tënde. Fillo direkt me analizën.\n"
        "2. Përgjigju VETËM në gjuhën SHQIPE me gramatikë të përsosur.\n"
        "3. Ndaji dy nivelet e analizës SAKTËSISHT me fjalën [NDARJA] në një rresht të ri.\n\n"
        "NIVELI 1: OPINIONI PROFESIONAL (Për Juristët)\n"
        "Shkruaj një analizë të thellë, me paragrafë të plotë, duke përdorur zhargon të lartë juridik. "
        "Analiza duhet të theksojë:\n"
        "- Baza Doktrinare: Cili është parimi thelbësor juridik që mbron ky nen?\n"
        "- Konteksti Kushtetues & KEDNJ: Si ndërlidhet me Kushtetutën e Kosovës dhe Konventën Evropiane për të Drejtat e Njeriut?\n"
        "- Implikimet Praktike & Rreziqet: Cilat janë vështirësitë në zbatimin e tij në gjykatat e Kosovës? Cilat janë hapësirat për abuzim procedural?\n\n"
        "NIVELI 2: KËSHILLIM PËR QYTETARIN (Pas fjalës [NDARJA])\n"
        "Tani ndrysho tonin. Shkruaj për një qytetar pa të ardhura për avokat. Bëhu mbrojtës, i qartë dhe praktik. "
        "Përdor SAKTËSISHT këta tre tituj me emoji:\n\n"
        "🔹 ÇFARË ËSHTË KY LIGJ?\n"
        "Trego thelbin në 2-3 fjali shumë të thjeshta.\n\n"
        "🛡️ PËR ÇFARË MUND T'JU SHËRBEJË?\n"
        "Jep shembuj konkretë të përditshmërisë se si ky nen i mbron ata nga padrejtësitë.\n\n"
        "💡 SI TA PËRDORNI (KËSHILLA PRAKTIKE)?\n"
        "Tregoju saktësisht se çfarë hapash duhet të ndërmarrin (p.sh. 'Kërkoni me shkrim që...', 'Mos pranoni të...')."
    )
    try:
        generator = llm_service.stream_text_async(
            system_prompt=system_prompt,
            user_prompt=request.prompt,
            temp=0.3
        )
        return StreamingResponse(generator, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Synthesis failed: {str(e)}")

# ----------------------------------------------------------------------
# DATA RETRIEVAL ENDPOINTS (FIXED: NOW USING legal_knowledge_base)
# ----------------------------------------------------------------------
@router.get("/search")
async def search_laws(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=200),
    current_user = Depends(get_current_user)
):
    """
    Search the legal knowledge base (laws and regulations).
    FIXED: Now uses agent_type='legal' to query legal_knowledge_base.
    """
    try:
        # FIXED: Use agent_type='legal' to query legal_knowledge_base
        raw_results = vector_store_service.query_public_library(
            query_text=q,
            n_results=limit,
            agent_type='legal'  # <--- CHANGED FROM 'business' TO 'legal'
        )
        results = []
        for item in raw_results:
            meta = item.get('metadata', {})
            results.append({
                "law_title": meta.get('law_title', 'Ligj i panjohur'),
                "article_number": meta.get('article_number'),
                "source": meta.get('source', item.get('source', '')),
                "text": item['content'],
                "chunk_id": meta.get('chunk_id', '')
            })
        unique = {}
        for r in results:
            key = (r['law_title'], r['article_number'] or '0')
            if key not in unique:
                unique[key] = r
        return list(unique.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/titles")
async def get_law_titles(current_user = Depends(get_current_user)):
    """
    Retrieve all unique law titles from legal_knowledge_base.
    FIXED: Now uses get_legal_kb_collection() directly.
    """
    try:
        # FIXED: Use legal_knowledge_base directly
        collection = vector_store_service.get_legal_kb_collection()
        results = collection.get(include=["metadatas"], limit=10000)
        metadatas = results.get("metadatas") or []
        titles: Set[str] = set()
        for m in metadatas:
            title = m.get("law_title")
            if isinstance(title, str):
                titles.add(title)
        return sorted(list(titles))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching titles: {str(e)}")

@router.get("/article")
async def get_law_article(
    law_title: str = Query(...),
    article_number: str = Query(...),
    current_user = Depends(get_current_user)
):
    """
    Retrieve a specific article of a law (all chunks concatenated).
    FIXED: Now uses get_legal_kb_collection().
    """
    try:
        # FIXED: Use legal_knowledge_base
        collection = vector_store_service.get_legal_kb_collection()
        results = collection.get(
            where={"$and": [{"law_title": {"$eq": law_title}}, {"article_number": {"$eq": article_number}}]},
            include=["documents", "metadatas"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []
    if not documents:
        raise HTTPException(status_code=404, detail="Article not found")

    if metadatas and all("chunk_index" in m for m in metadatas):
        pairs = list(zip(documents, metadatas))
        pairs.sort(key=lambda x: _safe_int(x[1].get("chunk_index")))
        documents = [d for d, _ in pairs]

    first_meta = metadatas[0] if metadatas else {}
    return {
        "law_title": first_meta.get("law_title", law_title),
        "article_number": first_meta.get("article_number", article_number),
        "source": first_meta.get("source", ""),
        "text": "\n\n".join(documents),
        "chunk_id": metadatas[0].get("chunk_id", "") if metadatas else ""
    }

@router.get("/by-title")
async def get_law_articles_by_title(
    law_title: str = Query(...),
    current_user = Depends(get_current_user)
):
    """
    Get overview of a law: list of article numbers.
    FIXED: Now uses get_legal_kb_collection().
    """
    try:
        # FIXED: Use legal_knowledge_base
        collection = vector_store_service.get_legal_kb_collection()
        results = collection.get(
            where={"law_title": {"$eq": law_title}},
            include=["metadatas"],
            limit=1000
        )
        metadatas = results.get("metadatas") or []
        if not metadatas:
            raise HTTPException(status_code=404, detail="Law not found")
        articles: Set[str] = set()
        for m in metadatas:
            article = m.get("article_number")
            if article is not None:
                articles.add(str(article))
        sorted_articles = sorted(list(articles), key=_natural_sort_key)
        first_m = metadatas[0] if metadatas else {}
        return {
            "law_title": first_m.get("law_title", law_title),
            "source": first_m.get("source", ""),
            "article_count": len(sorted_articles),
            "articles": sorted_articles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/{chunk_id}")
async def get_law_chunk(
    chunk_id: str,
    current_user = Depends(get_current_user)
):
    """
    Retrieve a single chunk by its ID.
    FIXED: Now uses get_legal_kb_collection().
    """
    try:
        # FIXED: Use legal_knowledge_base
        collection = vector_store_service.get_legal_kb_collection()
        result = collection.get(ids=[chunk_id], include=["documents", "metadatas"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    docs = result.get("documents") or []
    metas = result.get("metadatas") or []
    if not docs:
        raise HTTPException(status_code=404, detail="Law chunk not found")

    m = metas[0] if metas else {}
    return {
        "law_title": m.get("law_title", "Ligji i panjohur"),
        "article_number": m.get("article_number", ""),
        "source": m.get("source", ""),
        "text": docs[0]
    }