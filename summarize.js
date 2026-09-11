// Génère un résumé court d'un article.
// Ordre de priorité :
//   1. ANTHROPIC_API_KEY définie -> résumé via l'API Claude (payant à l'usage)
//   2. GEMINI_API_KEY définie   -> résumé via l'API Google Gemini (gratuit avec quota)
//   3. Sinon -> résumé "naïf" local (extraction des phrases du texte, sans IA)

const SUMMARY_INSTRUCTIONS = (title, text) => `Tu résumes un article de presse ou une interview sur le thème de la santé mentale au travail, pour un cabinet de conseil qui fait de la veille.
Titre : ${title}
Contenu : ${text.slice(0, 12000)}

Rédige un résumé synthétique de 6 à 8 lignes (environ 130 à 180 mots), en français, qui permet de comprendre en détail l'essentiel de l'article sans avoir à le lire : le sujet, le contexte, le ou les points clés, l'angle pris, et les données, exemples ou conclusions marquantes qu'il contient. Reste factuel et précis, pas de généralités vagues. Ne fais aucun commentaire, ne donne que le résumé, sans titre ni introduction.`;

// --- Option 1 : Claude (Anthropic), payant à l'usage ---
async function summarizeWithClaude(title, text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: SUMMARY_INSTRUCTIONS(title, text) }]
    })
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const block = data.content.find((c) => c.type === 'text');
  return block ? block.text.trim() : null;
}

// --- Option 2 : Google Gemini, gratuit avec quota ---
// GEMINI_MODEL est configurable car Google renomme régulièrement ses modèles ;
// si vous obtenez une erreur "model not found", vérifiez le nom actuel du
// modèle recommandé pour le niveau gratuit sur https://aistudio.google.com
// et changez la variable d'environnement GEMINI_MODEL en conséquence.
async function summarizeWithGemini(title, text) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: SUMMARY_INSTRUCTIONS(title, text) }] }],
      generationConfig: { maxOutputTokens: 500 }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const text_out = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text_out ? text_out.trim() : null;
}

// --- Option 3 : résumé local sans IA (extraction des phrases les plus "denses") ---
const STOPWORDS = new Set(
  ('le la les un une des de du et en à au aux ce ces cet cette il elle ils elles on nous vous ' +
    'je tu que qui quoi dont où pour par avec sans sur sous dans est sont a ont été être avoir ' +
    'son sa ses leur leurs mais ou donc or ni car plus moins très aussi comme entre').split(' ')
);

function scoredSentences(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 40 && s.length <= 350);
  if (sentences.length === 0) return clean.split(/(?<=[.!?])\s+/).slice(0, 4);

  const freq = {};
  sentences.forEach((s) => {
    s.toLowerCase()
      .match(/[a-zàâçéèêëîïôûùüÿñæœ]+/g)
      ?.forEach((w) => {
        if (w.length > 3 && !STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
      });
  });

  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]+/g) || [];
    const score = words.reduce((sum, w) => sum + (freq[w] || 0), 0) / Math.max(words.length, 1);
    return { s, i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 7).sort((a, b) => a.i - b.i);
  return top.map((t) => t.s);
}

function naiveSummary(text) {
  return scoredSentences(text).join(' ').slice(0, 1300);
}

async function summarize(title, text) {
  if (!text) return null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await summarizeWithClaude(title, text);
    } catch (err) {
      console.error('Résumé via API Claude échoué :', err.message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await summarizeWithGemini(title, text);
    } catch (err) {
      console.error('Résumé via API Gemini échoué, repli sur résumé local :', err.message);
    }
  }

  return naiveSummary(text);
}

module.exports = { summarize };
