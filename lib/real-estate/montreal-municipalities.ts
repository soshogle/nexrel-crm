/**
 * Montreal municipalities / boroughs (arrondissements) and demerged cities.
 * Used for neighborhood filtering in property evaluation.
 * Source: Ville de Montréal, Wikipedia Boroughs of Montreal
 */

/** 19 Montreal boroughs (post-2006) */
export const MONTREAL_BOROUGHS = [
  "Ahuntsic-Cartierville",
  "Anjou",
  "Côte-des-Neiges–Notre-Dame-de-Grâce",
  "Lachine",
  "LaSalle",
  "Le Plateau-Mont-Royal",
  "Le Sud-Ouest",
  "L'Île-Bizard–Sainte-Geneviève",
  "Mercier–Hochelaga-Maisonneuve",
  "Montréal-Nord",
  "Outremont",
  "Pierrefonds-Roxboro",
  "Rivière-des-Prairies–Pointe-aux-Trembles",
  "Rosemont–La Petite-Patrie",
  "Saint-Laurent",
  "Saint-Léonard",
  "Verdun",
  "Ville-Marie",
  "Villeray–Saint-Michel–Parc-Extension",
] as const;

/** Demerged municipalities on Montreal Island (common in listings) */
export const MONTREAL_ISLAND_MUNICIPALITIES = [
  "Baie-D'Urfé",
  "Beaconsfield",
  "Côte Saint-Luc",
  "Dollard-des-Ormeaux",
  "Dorval",
  "Hampstead",
  "Kirkland",
  "Montréal-Est",
  "Montréal-Ouest",
  "Mount Royal",
  "Pointe-Claire",
  "Sainte-Anne-de-Bellevue",
  "Senneville",
  "Westmount",
] as const;

/** All Montreal-area neighborhoods (boroughs + island municipalities) */
export const MONTREAL_MUNICIPALITIES = [
  ...MONTREAL_BOROUGHS,
  ...MONTREAL_ISLAND_MUNICIPALITIES,
] as const;

export type MontrealMunicipality = (typeof MONTREAL_MUNICIPALITIES)[number];
