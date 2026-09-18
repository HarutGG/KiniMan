const { GoogleGenerativeAI } = require("@google/generative-ai");
const { mapGenreIds, fallbackGenreIds } = require("./tmdb");

function parseGeminiJson(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("empty");
  }
  const stripped = raw.replace(/```json|```/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("no-json");
  }
  const candidate = stripped.slice(start, end + 1);
  return JSON.parse(candidate);
}

function fallbackInsight(answers) {
  const mood = answers.mood || "chill";
  const vibe = answers.vibe || "natural";
  const meal = answers.mealPreference || "salty";
  return {
    genres: ["Drama", "Comedy"],
    keywords: [],
    tmdb_genre_ids: fallbackGenreIds(answers),
    media_type: answers.duration === "series" ? "tv" : "movie",
    ai_reasoning_hy: `Քո ${mood} տրամադրությունն ու ${vibe} վայբը մենք համադրեցինք հանգիստ, բայց հետաքրքիր երեկոյի հետ։ Այս առաջարկները համընկնում են տեմպի և տևողության հետ, որ ընտրեցիր։`,
    snack_recommendation_hy:
      meal === "sweet"
        ? "Փափուկ պոպկորն կարամելով և տաք կակաո։"
        : meal === "spicy"
          ? "Կծու նաչոս և սառը լիմոնադ։"
          : meal === "healthy"
            ? "Մրգային աման և անանասի ջուր։"
            : meal === "drinks"
              ? "Մութ գինի կամ թունդ թեյ՝ ըստ տրամադրության։"
              : "Դասական աղի պոպկորն և հանքային ջուր լայմով։",
  };
}

async function geminiRecommend(answers) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return fallbackInsight(answers);

  const genAI = new GoogleGenerativeAI(key);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const prompt = `Դու ԿինոՄանի կինո-խորհրդատու ես։ Պատասխանիր ՄԻԱՅՆ վավեր JSON օբյեկտով, առանց markdown-ի։
Բոլոր տեքստային դաշտերը (ai_reasoning_hy, snack_recommendation_hy) պետք է լինեն սահուն, բնական հայերենով։

Օգտատիրոջ պատասխաններ.
- mood: ${answers.mood}
- vibe: ${answers.vibe}
- pace: ${answers.pace}
- duration: ${answers.duration}
- mealPreference: ${answers.mealPreference || "salty"}
- isPairMode: ${Boolean(answers.isPairMode)}
- surprise: ${Boolean(answers.surprise)}

JSON սխեմա.
{
  "genres": ["EnglishGenre1", "EnglishGenre2", "EnglishGenre3"],
  "keywords": ["short english keywords for TMDB"],
  "tmdb_genre_ids": [18, 35],
  "media_type": "movie" | "tv",
  "ai_reasoning_hy": "2-4 նախադասություն հայերեն՝ ինչու այս ժանրերը համապատասխանում են պատասխաններին",
  "snack_recommendation_hy": "հայերեն խորտիկի և խմիչքի առաջարկ՝ mealPreference-ի հիման վրա"
}

Կանոններ.
- media_type = "tv" միայն եթե duration = "series"
- tmdb_genre_ids օգտագործիր TMDB պաշտոնական ID-ներ (comedy 35, drama 18, action 28, thriller 53, romance 10749, scifi 878, horror 27, adventure 12, animation 16, documentary 99, crime 80, fantasy 14)
- եթե isPairMode true է, շեշտիր ընդհանուր համը
- եթե surprise true է, առաջարկիր քիչ հայտնի, բարձր գնահատականով գոհարներ
- մի՛ ավելացրու այլ բաներ JSON-ից դուրս`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseGeminiJson(text);
    const genreIds = mapGenreIds(parsed.genres, parsed.tmdb_genre_ids);
    return {
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      tmdb_genre_ids: genreIds.length ? genreIds : fallbackGenreIds(answers),
      media_type:
        parsed.media_type === "tv" || answers.duration === "series"
          ? "tv"
          : "movie",
      ai_reasoning_hy:
        typeof parsed.ai_reasoning_hy === "string" && parsed.ai_reasoning_hy.trim()
          ? parsed.ai_reasoning_hy.trim()
          : fallbackInsight(answers).ai_reasoning_hy,
      snack_recommendation_hy:
        typeof parsed.snack_recommendation_hy === "string" &&
        parsed.snack_recommendation_hy.trim()
          ? parsed.snack_recommendation_hy.trim()
          : fallbackInsight(answers).snack_recommendation_hy,
    };
  } catch (err) {
    console.warn("[gemini] fallback:", err.message);
    return fallbackInsight(answers);
  }
}

module.exports = { geminiRecommend, parseGeminiJson, fallbackInsight };
