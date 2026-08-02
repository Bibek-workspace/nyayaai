"""AI services: embeddings, chunking, RAG-based precedent search, summarization.

Uses OpenAI for both embeddings (text-embedding-3-large, 3072 dims) and
generation (gpt-4o-mini by default). Vector storage lives in Postgres via
pgvector. We deliberately keep LangChain usage thin — only the
RecursiveCharacterTextSplitter, because rolling our own chunker is rarely
worth it. Everything else is direct openai calls for clarity and control.
"""
from __future__ import annotations

import logging
import time
from typing import Iterable
from uuid import UUID

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import AsyncOpenAI
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.schemas import PrecedentHit, PrecedentSearchResponse

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
MAX_CONTEXT_CHUNKS = 8

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)

try:
    _enc = tiktoken.encoding_for_model("gpt-4o-mini")
except KeyError:
    _enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(s: str) -> int:
    return len(_enc.encode(s))


def chunk_text(content: str) -> list[str]:
    if not content or not content.strip():
        return []
    return _splitter.split_text(content)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed; OpenAI accepts up to 2048 inputs per call."""
    if not texts:
        return []
    resp = await _client.embeddings.create(
        model=settings.OPENAI_EMBED_MODEL,
        input=texts,
    )
    return [d.embedding for d in resp.data]


async def embed_query(query: str) -> list[float]:
    vectors = await embed_texts([query])
    return vectors[0]


async def index_document(db: AsyncSession, document: Document) -> int:
    """Chunk + embed a document's extracted_text, persist DocumentChunk rows.
    Returns number of chunks indexed.
    """
    if not document.extracted_text:
        return 0

    chunks = chunk_text(document.extracted_text)
    if not chunks:
        return 0

    embeddings = await embed_texts(chunks)
    rows = [
        DocumentChunk(
            document_id=document.id,
            chunk_index=i,
            content=chunk,
            embedding=emb,
            token_count=count_tokens(chunk),
        )
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]
    db.add_all(rows)
    await db.flush()
    return len(rows)


async def summarize_document(content: str, max_words: int = 250) -> str:
    """Produce a structured legal summary."""
    if not content.strip():
        return ""

    # Cap input to avoid context limits — first ~12k tokens is plenty for summary
    truncated = _enc.decode(_enc.encode(content)[:12000])

    prompt = f"""You are a legal analyst. Produce a structured summary of this legal document in at most {max_words} words.

Format strictly as:
**Document type:** <petition / judgment / order / affidavit / other>
**Parties:** <names if discernible, else 'not specified'>
**Key facts:** <2-3 sentence factual summary>
**Legal issues:** <bullet list, 2-4 items>
**Holding / Outcome:** <one or two sentences, or 'pending' if not a decision>
**Cited statutes / precedents:** <comma-separated list, or 'none identified'>

Document:
\"\"\"
{truncated}
\"\"\"
"""
    resp = await _client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=600,
    )
    return resp.choices[0].message.content.strip()


# ─── RAG precedent search ──────────────────────────────────────
async def precedent_search(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
) -> PrecedentSearchResponse:
    """Semantic search + LLM synthesis."""
    started = time.perf_counter()
    q_vec = await embed_query(query)

    # pgvector cosine distance operator: <=>. Smaller = closer. similarity = 1 - distance.
    sql = text("""
        SELECT
            dc.id           AS chunk_id,
            dc.document_id  AS document_id,
            dc.content      AS content,
            (1 - (dc.embedding <=> CAST(:q AS vector))) AS similarity,
            d.filename      AS filename,
            d.case_id       AS case_id
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        ORDER BY dc.embedding <=> CAST(:q AS vector)
        LIMIT :k
    """)
    result = await db.execute(sql, {"q": str(q_vec), "k": top_k})
    rows = result.mappings().all()

    hits: list[PrecedentHit] = [
        PrecedentHit(
            document_id=row["document_id"],
            filename=row["filename"],
            chunk_content=row["content"],
            similarity=float(row["similarity"]),
            case_id=row["case_id"],
        )
        for row in rows
    ]

    if not hits:
        return PrecedentSearchResponse(
            query=query,
            answer="No indexed precedents matched this query yet. Try uploading reference judgments to build the corpus.",
            hits=[],
            elapsed_ms=int((time.perf_counter() - started) * 1000),
        )

    # Build grounded context
    context_blocks = [
        f"[Source {i+1}: {h.filename}]\n{h.chunk_content}"
        for i, h in enumerate(hits[:MAX_CONTEXT_CHUNKS])
    ]
    context = "\n\n---\n\n".join(context_blocks)

    prompt = f"""You are a legal research assistant for the Indian judicial system. Using only the provided source excerpts, answer the query. Cite which source each claim draws from using bracketed numbers like [Source 1]. If the sources don't address the query, say so plainly — do not invent precedents or sections.

Query: {query}

Sources:
{context}

Answer (≤200 words, plain prose with inline citations):"""

    resp = await _client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=500,
    )
    answer = resp.choices[0].message.content.strip()

    return PrecedentSearchResponse(
        query=query,
        answer=answer,
        hits=hits,
        elapsed_ms=int((time.perf_counter() - started) * 1000),
    )
