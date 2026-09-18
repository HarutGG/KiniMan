import type { Mood, QuizAnswers, SnackPairing } from "./types";

const byMood: Record<Mood, SnackPairing> = {
  happy: {
    food: "Պոպկորն կարամելով",
    drink: "Լիմոնադ",
    note: "Քաղցր-աղի խրթխրթան՝ թեթև ծիծաղի համար։",
  },
  sad: {
    food: "Տաք շոկոլադով թխվածք",
    drink: "Սև թեյ մեղրով",
    note: "Ջերմ, փափուկ զույգ դրամայի գիշերին։",
  },
  tense: {
    food: "Կծու չիպսեր",
    drink: "Սառը կոլա",
    note: "Աղի խրթխրթան՝ սուսպենսը չկտրելու համար։",
  },
  romantic: {
    food: "Մուգ շոկոլադ և ելակ",
    drink: "Կարմիր գինի կամ հյութ",
    note: "Փոքր, էլեգանտ կծիկներ մեղմ լույսի ներքո։",
  },
  adventurous: {
    food: "Նաչոս պանրով",
    drink: "Մոխիտո առանց ալկոհոլի",
    note: "Էներգիա և համ՝ մեծ էկրանի արկածի հետ։",
  },
  chill: {
    food: "Պանիր և խաղող",
    drink: "Երիցուկի թեյ",
    note: "Հանգիստ սեղան՝ առանց շտապելու։",
  },
};

const byGenreId: Partial<Record<number, SnackPairing>> = {
  27: {
    food: "Կծու թևիկներ",
    drink: "Մութ գարեջուր կամ սոդա",
    note: "Համը կտրուկ է՝ ինչպես սարսափի պահերը։",
  },
  16: {
    food: "Գունավոր մարմելադ",
    drink: "Մրգային սմուզի",
    note: "Խաղալիք համեր անիմացիոն կադրերի համար։",
  },
  878: {
    food: "Սուշի կամ էդամամե",
    drink: "Տոնիկ լայմով",
    note: "Մաքուր, «ֆուտուրիստական» խորտիկ։",
  },
};

export function buildSnack(
  genreIds: number[],
  answers?: QuizAnswers,
): SnackPairing {
  for (const id of genreIds) {
    const hit = byGenreId[id];
    if (hit) return hit;
  }
  if (answers) return byMood[answers.mood];
  return {
    food: "Դասական աղի պոպկորն",
    drink: "Հանքային ջուր լայմով",
    note: "Չեզոք, միշտ աշխատող կինոզույգ։",
  };
}
