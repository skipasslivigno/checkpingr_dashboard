import { randomInt } from "node:crypto";

const WORDS = [
  "Abete", "Acero", "Acqua", "Alba", "Albero", "Alpe", "Ambra", "Aquila",
  "Arco", "Argento", "Aurora", "Avena", "Baita", "Balena", "Betulla", "Bosco",
  "Brezza", "Brina", "Camoscio", "Cedro", "Cervo", "Cielo", "Cima", "Corallo",
  "Daino", "Delfino", "Falco", "Faro", "Felce", "Fiocco", "Fiore", "Fiume",
  "Foglia", "Fonte", "Frassino", "Giglio", "Ginepro", "Girasole", "Lago", "Larice",
  "Lince", "Luna", "Mare", "Marmo", "Menta", "Monte", "Neve", "Nuvola",
  "Olivo", "Olmo", "Onda", "Orso", "Pietra", "Pino", "Prato", "Quercia",
  "Roccia", "Rosa", "Sole", "Stella", "Tiglio", "Valle", "Vento", "Viola",
] as const;
const SYMBOLS = "!@#$%&*?";

/** Short, readable temporary credentials; never persisted in plaintext. */
export function generateTemporaryPassword(): string {
  return `${WORDS[randomInt(WORDS.length)]}${randomInt(10000).toString().padStart(4, "0")}${SYMBOLS[randomInt(SYMBOLS.length)]}`;
}
