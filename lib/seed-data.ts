/**
 * Seed inicial — 28 convidados + 37 gifts.
 * Convidados derivados de gabriely-gustavo-wedding-design/ui_kits/wedding-gifts/data.js;
 * gifts espelham os ativos da tabela Gifts do Airtable (lista de 2026-10-20).
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
  { Name: "Passagens Aéreas do Casal", PriceCents: 200000, Limit: 1,
    Description: "Dois bilhetes pra Buenos Aires. Você vira oficialmente quem nos colocou no avião.", Tint: "#E8E5E0", Active: true },
  { Name: "Passeio pelo Tigre", PriceCents: 25000, Limit: 2,
    Description: "Um passeio de barco pra respirar e namorar.", Tint: "#E2E6DB", Active: true },
  { Name: "Primeiro Delivery como Casados", PriceCents: 8000, Limit: 3,
    Description: "A noite da volta em que ninguém vai cozinhar.", Tint: "#EDE7DC", Active: true },
  { Name: "Roteiro Gastronômico em Buenos Aires", PriceCents: 80000, Limit: 1,
    Description: "Um dia inteiro só comendo: parrilla, empanadas, alfajores e vinho. Prometemos mandar foto de cada prato.", Tint: "#EDE7DC", Active: true },
  { Name: "Foto no Obelisco", PriceCents: 5000, Limit: 4,
    Description: "Pra pagar a pose, o ângulo e as 40 tentativas.", Tint: "#E8E5E0", Active: true },
  { Name: "Filtro de Água", PriceCents: 65000, Limit: 1,
    Description: "Água limpa e gelada pra regar a vida a dois (e o café da manhã).", Tint: "#E4E8DD", Active: true },
  { Name: "Jogo de Toalhas", PriceCents: 20000, Limit: 2,
    Description: "Macias, como a nossa vida de casados deve ser.", Tint: "#E2E6DB", Active: true },
  { Name: "Noite de Tango", PriceCents: 40000, Limit: 2,
    Description: "Prometemos não pisar nos pés um do outro.", Tint: "#EDE7DC", Active: true },
  { Name: "Cota do PlayStation", PriceCents: 25000, Limit: 16,
    Description: "Pra noites de jogo a dois depois do casamento. Cada cota nos aproxima do console.", Tint: "#E8E5E0", Active: true },
  { Name: "Só Mais Uma Empanada", PriceCents: 3000, Limit: 10,
    Description: "A cota mais perigosa da viagem.", Tint: "#E2E6DB", Active: true },
  { Name: "Ingresso Teatro Colón", PriceCents: 20000, Limit: 4,
    Description: "Um dos teatros mais bonitos do mundo, a dois.", Tint: "#E8E5E0", Active: true },
  { Name: "Jogo de Panelas", PriceCents: 45000, Limit: 1,
    Description: "Pra cozinhar a dois e fingir que sabemos o que estamos fazendo.", Tint: "#E8E5E0", Active: true },
  { Name: "Air Fryer", PriceCents: 45000, Limit: 1,
    Description: "Pra fazer tudo crocante, inclusive as nossas desculpas pra não cozinhar.", Tint: "#EDE7DC", Active: true },
  { Name: "Jogo de Cama", PriceCents: 30000, Limit: 2,
    Description: "Pra manhãs de domingo que não têm hora pra acabar.", Tint: "#E4E8DD", Active: true },
  { Name: "Taças e Copos", PriceCents: 15000, Limit: 2,
    Description: "Pra brindar a vida a dois, e a vocês.", Tint: "#E2E6DB", Active: true },
  { Name: "Mesa que Levanta", PriceCents: 150000, Limit: 1,
    Description: "Pro noivo programar de pé e salvar a coluna. Ajude o nosso dev a ficar de pé (ou sentado, à escolha dele).", Tint: "#EDE7DC", Active: true },
  { Name: "Liquidificador", PriceCents: 20000, Limit: 1,
    Description: "Vitaminas, sopas e a bagunça gostosa de cozinhar juntos.", Tint: "#E4E8DD", Active: true },
  { Name: "Mala Extra", PriceCents: 15000, Limit: 2,
    Description: "Pra trazer alfajores e vinho na volta.", Tint: "#E8E5E0", Active: true },
  { Name: "Diária em Buenos Aires", PriceCents: 40000, Limit: 7,
    Description: "Ajude a escrever o primeiro capítulo da nossa viagem.", Tint: "#E2E6DB", Active: true },
  { Name: "Malbec que Fingimos Entender", PriceCents: 12000, Limit: 3,
    Description: "Cota pra degustação: vamos falar de taninos com muita confiança.", Tint: "#E4E8DD", Active: true },
  { Name: "Seguro Viagem", PriceCents: 20000, Limit: 2,
    Description: "Pra viajar sem preocupação (e sem ligar chorando pra vocês).", Tint: "#E4E8DD", Active: true },
  { Name: "Cota Master do Robô", PriceCents: 120000, Limit: 1,
    Description: "O maior passo rumo ao robô de limpeza dos nossos sonhos. Você ganha o título de padrinho (ou madrinha) da casa limpa.", Tint: "#E4E8DD", Active: true },
  { Name: "Câmbio Blue", PriceCents: 6000, Limit: 5,
    Description: "Ajuda pra negociar o dólar como os locais.", Tint: "#E8E5E0", Active: true },
  { Name: "Dia de Spa a Dois", PriceCents: 75000, Limit: 1,
    Description: "Um dia pra desacelerar e relaxar juntos, depois de tanta correria de casamento.", Tint: "#E2E6DB", Active: true },
  { Name: "Alfajores de Consumo Imediato", PriceCents: 4000, Limit: 10,
    Description: "Nem vão chegar ao hotel.", Tint: "#E2E6DB", Active: true },
  { Name: "Cafeteira", PriceCents: 30000, Limit: 1,
    Description: "O café que vai começar todos os nossos dias.", Tint: "#EDE7DC", Active: true },
  { Name: "Batize o Robô", PriceCents: 5000, Limit: 1,
    Description: "Quem presentear escolhe o nome do nosso novo morador.", Tint: "#EDE7DC", Active: true },
  { Name: "Jantar em uma Parrilla", PriceCents: 30000, Limit: 3,
    Description: "Carne, vinho e a gente de olhos brilhando.", Tint: "#E4E8DD", Active: true },
  { Name: "Robô de Limpeza", PriceCents: 15000, Limit: 12,
    Description: "Ele varre a casa, a gente aproveita o tempo livre pra comer.", Tint: "#E4E8DD", Active: true },
  { Name: "Fernet com Coca", PriceCents: 5000, Limit: 6,
    Description: "O drink oficial da Argentina. Um brinde por vocês!", Tint: "#EDE7DC", Active: true },
  { Name: "Medialunas no Café da Manhã", PriceCents: 4000, Limit: 6,
    Description: "A gente promete uma por dia. (Mentira, são três.)", Tint: "#E4E8DD", Active: true },
  { Name: "Dulce de Leche a Colheradas", PriceCents: 3500, Limit: 6,
    Description: "Direto do pote, sem julgamento.", Tint: "#EDE7DC", Active: true },
  { Name: "Pratos e Talheres", PriceCents: 35000, Limit: 1,
    Description: "Pra receber vocês com a mesa bonita (e comida de sobra).", Tint: "#E8E5E0", Active: true },
  { Name: "Passagem Aérea", PriceCents: 25000, Limit: 10,
    Description: "Ajude a gente a chegar em Buenos Aires.", Tint: "#E8E5E0", Active: true },
  { Name: "Fome de Aeroporto", PriceCents: 6000, Limit: 4,
    Description: "O lanche que vai salvar o casal na conexão.", Tint: "#E2E6DB", Active: true },
  { Name: "Kit Churrasco", PriceCents: 20000, Limit: 1,
    Description: "Faca, tábua e espetos pra o primeiro churrasco como casados.", Tint: "#EDE7DC", Active: true },
  { Name: "A Dieta Começa Segunda", PriceCents: 5000, Limit: 4,
    Description: "Cota pra salada pós-lua de mel. Talvez.", Tint: "#E4E8DD", Active: true },
];

/** Formata centavos → "R$ X,YY" (V6/V12). */
export function fmtBRL(cents: number): string {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}
