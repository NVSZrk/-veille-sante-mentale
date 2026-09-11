// Génère un résumé court d'un article.
// Si ANTHROPIC_API_KEY est définie dans .env, on appelle l'API Claude.
// Sinon on retombe sur un résumé naïf (premières phrases) pour que
// la plateforme reste fonctionnelle sans clé configurée.

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

async function summarizeWithClaude(title, text) {
  const prompt = `Tu résumes un article de presse ou une interview sur le thème de la santé mentale au travail, pour un cabinet de conseil qui fait de la veille.
Titre : ${title}
Contenu : ${text.slice(0, 12000)}

Rédige un résumé de 3 à 4 phrases maximum, factuel, en français, qui permet de comprendre l'essentiel de l'article sans avoir à le lire. Ne fais aucun commentaire, ne donne que le résumé.`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const block = data.content.find((c) => c.type === 'text');
  return block ? block.text.trim() : null;
}

function naiveSummary(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).slice(0, 3);
  return sentences.join(' ').slice(0, 500);
}

async function summarize(title, text) {
  if (!text) return null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await summarizeWithClaude(title, text);
    } catch (err) {
      console.error('Résumé via API échoué, repli sur résumé naïf :', err.message);
      return naiveSummary(text);
    }
  }
  return naiveSummary(text);
}

module.exports = { summarize };
