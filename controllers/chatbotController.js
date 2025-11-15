import FAQ from "../models/FAQ.js";
import Fuse from "fuse.js";
import nlp from "compromise";
import natural from "natural";

const wordnet = new natural.WordNet();

function cleanSentence(sentence) {
  const stopwords = [
    "the","what","is","are","how","tell","me","about","please","pls",
    "bro","hey","hi","can","you","give","some","info","information",
    "details","explain"
  ];

  return sentence
    .toLowerCase()
    .split(" ")
    .filter(word => !stopwords.includes(word))
    .join(" ");
}

async function getSynonyms(word) {
  return new Promise((resolve) => {
    wordnet.lookup(word, (results) => {
      const syns = [];
      results.forEach(result => {
        syns.push(...result.synonyms);
      });
      resolve(syns.map(s => s.toLowerCase()));
    });
  });
}

export const handleMessage = async (req, res) => {
  try {
    const originalMsg = req.body.message || "";
    const msg = originalMsg.toLowerCase().trim();
    const cleanedMsg = cleanSentence(msg);

    const faqs = await FAQ.find({});
    if (!faqs.length) {
      return res.json({ reply: "No FAQs available yet." });
    }

    // NLP keyword extraction
    const doc = nlp(originalMsg);
    const extracted = [
      ...doc.nouns().out("array"),
      ...doc.verbs().out("array"),
      ...doc.topics().out("array"),
    ].map(k => k.toLowerCase());

    let allSearchWords = new Set([cleanedMsg, msg, ...extracted]);

    // Add synonyms
    for (let word of extracted) {
      const synList = await getSynonyms(word);
      synList.forEach(s => allSearchWords.add(s));
    }

    allSearchWords = Array.from(allSearchWords);

    // Fuzzy search with Fuse.js
    const fuse = new Fuse(faqs, {
      keys: ["question", "tags"],
      threshold: 0.4
    });

    // 1) Direct search
    let result = fuse.search(cleanedMsg);

    // 2) Keyword/synonym search
    if (!result.length) {
      for (const w of allSearchWords) {
        const r = fuse.search(w);
        if (r.length > 0) {
          result = r;
          break;
        }
      }
    }

    // 3) Fallback direct match
    if (!result.length) {
      const fallback = faqs.find(f =>
        f.question.toLowerCase().includes(msg)
      );
      if (fallback) {
        return res.json({ reply: fallback.answer });
      }
    }

    // 4) No result fallback
    if (!result.length) {
      return res.json({
        reply: "Sorry, I couldn't find information on that."
      });
    }

    const bestFAQ = result[0].item;
    return res.json({ reply: bestFAQ.answer });

  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
