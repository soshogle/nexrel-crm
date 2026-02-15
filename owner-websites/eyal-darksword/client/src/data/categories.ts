export interface Category {
  slug: string;
  name: string;
  count: number;
  description: string;
}

export const categories: Category[] = [
  { slug: "medieval-swords", name: "Medieval Swords", count: 94, description: "" },
  { slug: "two-handed-sword", name: "Two Handed Swords", count: 50, description: "" },
  { slug: "new-products", name: "New Products", count: 47, description: "" },
  { slug: "swords", name: "All Swords", count: 43, description: "" },
  { slug: "medieval-jewelry", name: "Medieval Jewelry", count: 42, description: "" },
  { slug: "antique-weapons", name: "Antiques", count: 38, description: "" },
  { slug: "one-handed-sword", name: "One Handed Swords", count: 36, description: "" },
  { slug: "medieval-armor", name: "Medieval Armor", count: 33, description: "" },
  { slug: "fantasy-sword", name: "Fantasy Swords", count: 31, description: "" },
  { slug: "medieval-daggers", name: "Medieval Daggers", count: 24, description: "" },
  { slug: "swords-armors-weapons-sale", name: "On Sale", count: 23, description: "" },
  { slug: "elite-series-damascus-steel-swords", name: "Damascus Steel Swords", count: 22, description: "" },
  { slug: "longsword", name: "Longswords", count: 18, description: "" },
  { slug: "hilt-sets", name: "Hilt Sets", count: 17, description: "" },
  { slug: "viking-swords", name: "Viking Swords", count: 16, description: "" },
  { slug: "medieval-shields", name: "Medieval Shields", count: 16, description: "" },
  { slug: "combat-ready-medieval-helmet", name: "Medieval Helmets", count: 16, description: "" },
  { slug: "medieval-axes", name: "Axes", count: 14, description: "" },
  { slug: "lord-of-the-rings-lotr-swords", name: "LOTR Swords", count: 14, description: "" },
  { slug: "gothic-jewelry", name: "Gothic Jewelry", count: 14, description: "" },
  { slug: "halloween-fanstasy-swords", name: "Halloween Fantasy Swords", count: 13, description: "" },
  { slug: "accessories", name: "Accessories", count: 13, description: "" },
  { slug: "viking-jewelry", name: "Viking Jewelry", count: 12, description: "" },
  { slug: "axes-viking-axes", name: "Viking Axes", count: 12, description: "" },
  { slug: "antiques", name: "Ferrum Historia", count: 9, description: "" },
  { slug: "celtic-jewelry", name: "Celtic Jewelry", count: 7, description: "" },
  { slug: "hema-swords-wma-swords-weapons", name: "HEMA Swords", count: 6, description: "" },
  { slug: "broadsword", name: "Broadswords", count: 6, description: "" },
  { slug: "halstein-forge", name: "Halstein Forge", count: 6, description: "" },
  { slug: "knives", name: "Knives", count: 6, description: "" },
  { slug: "herald-series-medieval-weapons", name: "Herald Series", count: 6, description: "" },
  { slug: "norman-swords", name: "Norman Swords", count: 5, description: "" },
  { slug: "game-of-thrones", name: "Game of Thrones", count: 5, description: "" },
  { slug: "medieval-armors", name: "Full Suit Armors", count: 5, description: "" },
  { slug: "templar-sword", name: "Templar Swords", count: 4, description: "" },
  { slug: "claymore-swords", name: "Claymore Swords", count: 4, description: "" },
  { slug: "arming-swords", name: "Arming Swords", count: 4, description: "" },
  { slug: "battle-axes", name: "Battle Axes", count: 4, description: "" },
  { slug: "medieval-gauntlets", name: "Medieval Gauntlets", count: 4, description: "" },
  { slug: "samurai-swords-katanas-japanese-swords", name: "Samurai Swords", count: 3, description: "" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}
