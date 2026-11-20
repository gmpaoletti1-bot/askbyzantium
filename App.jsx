import "./App.css";
import { useEffect, useMemo, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AI_ENDPOINT = import.meta.env.VITE_ASK_BYZANTIUM_AI_ENDPOINT;

const CORPORA = {
  IAMB: {
    prefix: "IAMB-",
    name: "IAMB paraenetic poems",
    manuscript: "IAMB corpus",
    source: "IAMB corpus",
  },
  PGN: {
    prefix: "PGN-",
    name: "Ps. Gregory of Nazianzos",
    manuscript: "Par. gr. 400",
    hands: "Pa / Pb",
    source:
      "Marc D. Lauxtermann, “Parisinus Graecus 400. Poetry and Paraenesis in Cyprus,” Revue des études byzantines 79 (2021), 149–181, esp. 174–179.",
  },
};

function escapeFilter(value) {
  return String(value).replaceAll(",", "\\,").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

async function dbGet(path) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("The database connection is not configured. Add the Supabase environment variables in Netlify.");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase returned ${response.status}: ${detail}`);
  }
  return response.json();
}

async function loadCorpus(key) {
  const corpus = CORPORA[key];
  const workQuery = new URLSearchParams({
    project_id: `like.${corpus.prefix}*`,
    select: "id,project_id,title_greek,title_latin,verse_count,status,notes",
    order: "project_id.asc",
    limit: "1000",
  });
  const works = await dbGet(`works?${workQuery}`);
  if (!works.length) return [];

  const workIds = works.map((work) => work.id);
  const textQuery = new URLSearchParams({
    work_id: `in.(${workIds.join(",")})`,
    select: "id,work_id,text_type,language,label",
    limit: "3000",
  });
  const texts = await dbGet(`texts?${textQuery}`);
  if (!texts.length) {
    return works.map((work) => ({
      ...work,
      corpus: key,
      corpusInfo: corpus,
      verses: [],
      variants: [],
    }));
  }

  const textIds = texts.map((item) => item.id);
  const verseQuery = new URLSearchParams({
    text_id: `in.(${textIds.join(",")})`,
    select: "text_id,verse_number,greek_text,critical_greek,translation,critical_apparatus",
    order: "text_id.asc,verse_number.asc",
    limit: "10000",
  });
  const verses = await dbGet(`verses?${verseQuery}`);

  const textById = new Map(texts.map((item) => [item.id, item]));
  const workById = new Map(
    works.map((work) => [
      work.id,
      { ...work, corpus: key, corpusInfo: corpus, verses: [], variants: [], edition: null },
    ]),
  );

  texts.forEach((item) => {
    const work = workById.get(item.work_id);
    if (!work) return;
    const layer = { ...item, verses: [] };
    if (item.text_type === "variant_text") work.variants.push(layer);
    else work.edition = layer;
  });

  verses.forEach((item) => {
    const text = textById.get(item.text_id);
    const work = text && workById.get(text.work_id);
    if (!work) return;
    const verse = {
      number: item.verse_number,
      greek: item.critical_greek || item.greek_text || "",
      translation: item.translation || "",
      apparatus: item.critical_apparatus || "",
    };
    if (text.text_type === "variant_text") {
      work.variants.find((variant) => variant.id === text.id)?.verses.push(verse);
    } else {
      work.edition?.verses.push(verse);
      work.verses.push(verse);
    }
  });

  return [...workById.values()].map((work) => ({
    ...work,
    incipit: work.verses[0]?.greek || "",
  }));
}

async function loadAllWorks() {
  const [iamb, pgn] = await Promise.all([loadCorpus("IAMB"), loadCorpus("PGN")]);
  return [...iamb, ...pgn];
}

function poemNumber(id = "") {
  return id.replace(/^[A-Z]+-/, "").replace(/^0+/, "") || "1";
}

function App() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("explore");
  const [query, setQuery] = useState("");
  const [corpusFilter, setCorpusFilter] = useState("all");
  const [selectedWork, setSelectedWork] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [asking, setAsking] = useState(false);
  const [matchedPassages, setMatchedPassages] = useState([]);

  useEffect(() => {
    let active = true;
    loadAllWorks()
      .then((items) => {
        if (active) setWorks(items);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Could not load the corpus.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredWorks = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return works.filter((work) => {
      if (corpusFilter !== "all" && work.corpus !== corpusFilter) return false;
      if (!term) return true;
      const searchable = [
        work.project_id,
        work.title_greek,
        work.title_latin,
        work.incipit,
        work.corpusInfo.name,
        ...work.verses.flatMap((verse) => [verse.greek, verse.translation]),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(term);
    });
  }, [works, query, corpusFilter]);

  function findPassages(text) {
    const terms = text
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2);
    const matches = [];
    works.forEach((work) => {
      work.verses.forEach((verse) => {
        const haystack = `${verse.greek} ${verse.translation}`
          .toLocaleLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        if (score > 0) {
          matches.push({
            score,
            work,
            verse,
            reference: `${work.corpusInfo.name}, ${work.corpus === "PGN" ? `Poem ${poemNumber(work.project_id)}` : work.project_id}, verse ${verse.number}`,
          });
        }
      });
    });
    return matches.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  async function askCorpus(event) {
    event.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    setAnswerError("");
    const passages = findPassages(question);
    setMatchedPassages(passages);
    if (!passages.length) {
      setAnswer("I could not find a passage with matching words in the currently connected corpus. Try a different formulation or browse the texts directly.");
      setAsking(false);
      return;
    }
    if (!AI_ENDPOINT) {
      setAnswer(
        "I found passages that may be relevant. AI interpretation is not configured yet, so the results below are a transparent text search rather than a generated historical interpretation.",
      );
      setAsking(false);
      return;
    }
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          passages: passages.map(({ reference, verse, work }) => ({
            reference,
            greek: verse.greek,
            translation: verse.translation,
            author_or_corpus: work.corpusInfo.name,
            manuscript: work.corpusInfo.manuscript,
          })),
        }),
      });
      if (!response.ok) throw new Error(`The interpretation service returned ${response.status}.`);
      const data = await response.json();
      setAnswer(data.answer || data.interpretation || "The interpretation service returned no answer.");
    } catch (error) {
      setAnswerError(error.message || "Could not generate an interpretation.");
    } finally {
      setAsking(false);
    }
  }

  const totalVerses = works.reduce((sum, work) => sum + work.verses.length, 0);

  return (
    <main className="app-shell">
      <section className="codex">
        <p className="eyebrow">λόγος παραινετικός · BYZANTINE GREEK</p>
        <h1 className="wordmark"><span>A</span>SK BYZANTIUM</h1>
        <p className="subtitle">Look for advice in the manuscripts</p>

        <div className="mode-switch" role="tablist" aria-label="Choose a mode">
          <button className={mode === "explore" ? "active" : ""} onClick={() => { setMode("explore"); setSelectedWork(null); }} role="tab" aria-selected={mode === "explore"}>Explore the corpus</button>
          <button className={mode === "ask" ? "active" : ""} onClick={() => { setMode("ask"); setSelectedWork(null); }} role="tab" aria-selected={mode === "ask"}>Ask the authors</button>
        </div>

        {mode === "explore" ? (
          <>
            <p className="intro">Explore the poems, read the Greek and translations, and follow each passage back to its textual witness.</p>
            <div className="toolbar">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Greek, translation, author or poem…" aria-label="Search the corpus" />
              <select value={corpusFilter} onChange={(event) => setCorpusFilter(event.target.value)} aria-label="Filter corpus">
                <option value="all">All corpora</option>
                <option value="IAMB">IAMB</option>
                <option value="PGN">Ps. Gregory</option>
              </select>
            </div>
            <div className="stats">
              <span><strong>{loading ? "…" : works.length}</strong> works</span>
              <span><strong>{loading ? "…" : totalVerses}</strong> edited verses</span>
              <span><strong>2</strong> corpora</span>
            </div>
            {loading && <p className="status">Opening the codices…</p>}
            {loadError && <p className="error">{loadError}</p>}
            {!loading && !loadError && !selectedWork && (
              <div className="work-list">
                {filteredWorks.map((work) => (
                  <button className="work-card" key={work.id} onClick={() => setSelectedWork(work)}>
                    <span className="eyebrow">{work.corpusInfo.name} · {work.project_id}</span>
                    <strong>{work.corpus === "PGN" ? `Poem ${poemNumber(work.project_id)}` : (work.title_latin || work.title_greek || work.project_id)}</strong>
                    {work.incipit && <span className="incipit">{work.incipit}</span>}
                    <span className="metadata">{work.verse_count ?? work.verses.length} verses · {work.corpusInfo.manuscript}</span>
                  </button>
                ))}
                {!filteredWorks.length && <p className="status">No works match this search.</p>}
              </div>
            )}
            {selectedWork && (
              <article className="work-detail">
                <button className="text-button" onClick={() => setSelectedWork(null)}>← Back to corpus</button>
                <p className="eyebrow">{selectedWork.corpusInfo.name} · {selectedWork.project_id}</p>
                <h2>{selectedWork.corpus === "PGN" ? `Poem ${poemNumber(selectedWork.project_id)}` : (selectedWork.title_latin || selectedWork.title_greek || selectedWork.project_id)}</h2>
                {selectedWork.corpus === "PGN" && <p className="metadata">The opening words are an incipit, not an editorial title.</p>}
                <div className="verse-list">
                  {selectedWork.verses.map((verse) => (
                    <div className="verse" key={verse.number}>
                      <span className="verse-number">{verse.number}</span>
                      <div>
                        <p className="greek">{verse.greek || "Greek text not available"}</p>
                        {verse.translation && <p className="translation">{verse.translation}</p>}
                        {verse.apparatus && <details><summary>Critical apparatus</summary><p>{verse.apparatus}</p></details>}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedWork.variants.map((variant) => (
                  <section className="variant" key={variant.id}>
                    <h3>{variant.label || "Variant text"}</h3>
                    {variant.verses.map((verse) => <p key={verse.number}><strong>{verse.number}.</strong> {verse.greek}<br/><em>{verse.translation}</em></p>)}
                  </section>
                ))}
                <aside className="source-note">
                  <strong>Witness / source</strong>
                  <p>{selectedWork.corpusInfo.manuscript}{selectedWork.corpusInfo.hands ? ` · Hands ${selectedWork.corpusInfo.hands}` : ""}</p>
                  <p>{selectedWork.corpusInfo.source}</p>
                </aside>
              </article>
            )}
          </>
        ) : (
          <>
            <p className="intro">Describe a moral question. Ask Byzantium will search the connected texts and show the passages that may speak to it.</p>
            <form className="question-form" onSubmit={askCorpus}>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="For example: How should I deal with envy?" rows={3} />
              <button type="submit" disabled={asking || loading || !works.length}>{asking ? "Consulting the manuscripts…" : "Search for Byzantine counsel"}</button>
            </form>
            {answer && <section className="answer"><p className="eyebrow">RESPONSE</p><p>{answer}</p></section>}
            {answerError && <p className="error">{answerError}</p>}
            {!!matchedPassages.length && (
              <section className="matched-passages">
                <p className="eyebrow">PASSAGES FOUND IN THE CORPUS</p>
                {matchedPassages.map(({ reference, verse, work }) => (
                  <article className="passage" key={`${work.id}-${verse.number}`}>
                    <p className="greek">{verse.greek || "Greek text not available"}</p>
                    {verse.translation && <p className="translation">{verse.translation}</p>}
                    <p className="metadata">{reference} · {work.corpusInfo.manuscript}</p>
                  </article>
                ))}
              </section>
            )}
            <p className="disclaimer">The passages shown are retrieved from the database. Interpretations, when enabled, must be distinguished from the medieval text itself.</p>
          </>
        )}
        <footer className="footer">ASK BYZANTIUM · A DIGITAL EXPERIMENT IN BYZANTINE PARAENESIS</footer>
      </section>
    </main>
  );
}

export default App;
