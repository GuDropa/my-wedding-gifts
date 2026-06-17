/**
 * Seed inicial — 28 convidados + 10 gifts.
 * Derivado de gabriely-gustavo-wedding-design/ui_kits/wedding-gifts/data.js.
 * §V4: guest ∈ lista fechada. §V6: preços em centavos.
 */

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const GUEST_NAMES = [
  "Marina Alves", "Rafael Costa", "Beatriz Souza", "Lucas Pereira", "Helena Lima",
  "Thiago Rocha", "Camila Dias", "Bruno Martins", "Larissa Gomes", "Felipe Araújo",
  "Júlia Ribeiro", "Gabriel Reis", "Ana Carolina", "Pedro Henrique", "Sofia Mendes",
  "Mateus Barros", "Isabela Cunha", "Vinícius Melo", "Laura Freitas", "Diego Nunes",
  "Carolina Pires", "André Lopes", "Manuela Castro", "Eduardo Ramos", "Clara Vieira",
  "Gustavo Pai", "Dona Cleusa", "Tio Sérgio",
];

export const SEED_GUESTS = GUEST_NAMES.map((name) => ({
  Name: name,
  Initial: name[0],
  GuestKey: slug(name),
  Viewed: false,
}));

export const SEED_GIFTS = [
  { Name: "Jogo de Panelas", PriceCents: 18000, Limit: 3,
    Description: "Para as primeiras receitas na nossa cozinha juntos.", Tint: "#E4E8DD", Active: true },
  { Name: "Jantar Romântico", PriceCents: 25000, Limit: 5,
    Description: "Nos presenteie com uma noite só nossa, à luz de velas.", Tint: "#EDE7DC", Active: true },
  { Name: "Jogo de Lençóis", PriceCents: 12000, Limit: 4,
    Description: "Para as manhãs preguiçosas de domingo.", Tint: "#E8E5E0", Active: true },
  { Name: "Cafeteira", PriceCents: 9000, Limit: 2,
    Description: "O café que vai começar todos os nossos dias.", Tint: "#E4E8DD", Active: true },
  { Name: "Diária na Lua de Mel", PriceCents: 45000, Limit: 8,
    Description: "Ajude a escrever o primeiro capítulo da nossa viagem.", Tint: "#E2E6DB", Active: true },
  { Name: "Conjunto de Taças", PriceCents: 7500, Limit: 3,
    Description: "Para brindar a vida a dois — e a vocês.", Tint: "#EDE7DC", Active: true },
  { Name: "Aspirador Robô", PriceCents: 32000, Limit: 2,
    Description: "Para a casa ficar linda enquanto a gente namora.", Tint: "#E8E5E0", Active: true },
  { Name: "Cesta de Café da Manhã", PriceCents: 6000, Limit: 6,
    Description: "Carinho servido na cama no nosso primeiro fim de semana.", Tint: "#E4E8DD", Active: true },
  { Name: "Liquidificador", PriceCents: 8500, Limit: 3,
    Description: "Vitaminas, sopas e a bagunça gostosa de cozinhar juntos.", Tint: "#EDE7DC", Active: true },
  { Name: "Air Fryer", PriceCents: 14000, Limit: 3,
    Description: "Praticidade para os dias em que o amor é a única pressa.", Tint: "#E2E6DB", Active: true },
];

/** Formata centavos → "R$ X,YY" (V6/V12). */
export function fmtBRL(cents: number): string {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}
