import { useState } from "react";

export default function App() {
  const texts = [
    {
      theme: "friendship",
      greek: "Φίλον τίμα ὡς σεαυτόν.",
      translation: "Honor your friend as yourself.",
    },
    {
      theme: "friendship",
      greek: "Μὴ ταχέως πίστευε, ἀλλὰ πιστεύσας μένε.",
      translation: "Do not trust quickly, but once you trust, remain steadfast.",
    },
    {
      theme: "love",
      greek: "Ἡ ἀγάπη μακροθυμεῖ καὶ χρηστεύεται.",
      translation: "Love is patient and kind.",
    },
    {
      theme: "love",
      greek: "Μὴ ἐν λόγοις μόνον, ἀλλὰ καὶ ἐν ἔργοις ἀγάπα.",
      translation: "Love not only in words, but also in deeds.",
    },
    {
      theme: "anger",
      greek: "Γλῶσσαν χαλίνου, θυμὸν κοίμιζε.",
      translation: "Bridle your tongue, and let your anger sleep.",
    },
    {
      theme: "fear",
      greek: "Μὴ δείλια, ψυχή· ἡ θλῖψις παιδεύει.",
      translation: "Do not be afraid, soul; suffering teaches.",
    },
  ];

  const [result, setResult] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("friendship");

  function generateAdvice() {
    const filtered = texts.filter((text) => text.theme === selectedTheme);
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setResult(random);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 30% 20%, #6a1a1a 0%, #4a0f0f 40%, #1a0505 100%)",
        padding: "60px 20px",
        fontFamily: "Georgia, serif",
        color: "#f5e6c8",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          background: "#f7f0dc",
          padding: "70px 70px 80px 70px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "1px solid #b89a63",
        }}
      >
        <p
          style={{
            textAlign: "center",
            color: "#9b2d20",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: "13px",
            marginBottom: "18px",
          }}
        >
          λόγος παραινετικός
        </p>

        <h1
          style={{
            fontFamily: "'Uncial Antiqua', serif",
            fontSize: "80px",
            textAlign: "center",
            margin: "0 0 25px 0",
            color: "#5a3b1a",
            letterSpacing: "0.08em",
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              fontSize: "150px",
              color: "#9e2f1f",
              marginRight: "10px",
              textShadow: "2px 2px 0 #d9c08a",
            }}
          >
            A
          </span>
          SK BYZANTIUM
        </h1>

        <p
          style={{
            textAlign: "center",
            fontStyle: "italic",
            fontSize: "18px",
            marginBottom: "24px",
            color: "#6b5640",
          }}
        >
          Look for advice in the manuscripts
        </p>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            style={{
              background: "transparent",
              border: "1px solid #b89a63",
              color: "#5a3b1a",
              padding: "10px 14px",
              fontSize: "16px",
              fontFamily: "Georgia, serif",
            }}
          >
            <option value="friendship">Friendship</option>
            <option value="love">Love</option>
            <option value="anger">Anger</option>
            <option value="fear">Fear</option>
          </select>
        </div>

        <div style={{ textAlign: "center", marginBottom: "46px" }}>
          <button
            onClick={generateAdvice}
            style={{
              background: "none",
              border: "none",
              borderBottom: "1px solid #7a5a2a",
              color: "#7a5a2a",
              fontFamily: "Georgia, serif",
              fontSize: "18px",
              cursor: "pointer",
              padding: "6px 10px",
              letterSpacing: "0.04em",
            }}
          >
            Open the codex
          </button>
        </div>

        <div
          style={{
            minHeight: "180px",
            borderTop: "1px solid #ceb98d",
            paddingTop: "32px",
          }}
        >
          {result ? (
            <>
              <p
                style={{
                  fontSize: "30px",
                  lineHeight: 1.75,
                  textAlign: "center",
                  marginBottom: "22px",
                  color: "#2f2417",
                }}
              >
                {result.greek}
              </p>

              <p
                style={{
                  fontSize: "19px",
                  fontStyle: "italic",
                  lineHeight: "1.7",
                  textAlign: "center",
                  color: "#5d4936",
                  margin: 0,
                }}
              >
                {result.translation}
              </p>
            </>
          ) : (
            <p
              style={{
                textAlign: "center",
                fontStyle: "italic",
                color: "#8a755b",
                margin: 0,
              }}
            >
              No counsel has yet been revealed.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}