// Word database. Kept in its own file so categories/words can be
// expanded independently of game logic.

export const WORD_BANK: Record<string, string[]> = {
  Actor: [
    "Salman Khan",
    "Shah Rukh Khan",
    "Aamir Khan",
    "Leonardo DiCaprio",
    "Tom Cruise",
    "Dwayne Johnson",
    "Robert Downey Jr.",
    "Keanu Reeves",
  ],
  Movies: [
    "Interstellar",
    "Titanic",
    "Inception",
    "The Dark Knight",
    "Joker",
    "Avengers",
    "Harry Potter",
  ],
  Food: ["Pizza", "Burger", "Biryani", "Sushi", "Pasta", "Ice Cream", "Noodles"],
  Animals: ["Lion", "Tiger", "Elephant", "Dolphin", "Penguin", "Wolf", "Giraffe"],
  Countries: ["Pakistan", "India", "Japan", "Turkey", "Canada", "Australia", "Brazil"],
  Games: ["Minecraft", "Roblox", "Fortnite", "GTA V", "Valorant", "FIFA", "Among Us"],
  Sports: ["Cricket", "Football", "Basketball", "Tennis", "Boxing", "Formula 1"],
};

export function pickRandomCategoryAndWord(): { category: string; word: string } {
  const categories = Object.keys(WORD_BANK);
  const category = categories[Math.floor(Math.random() * categories.length)];
  const words = WORD_BANK[category];
  const word = words[Math.floor(Math.random() * words.length)];
  return { category, word };
}
