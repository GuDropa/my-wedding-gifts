# SPEC — Lista de Presentes · Gabriely & Gustavo

## §G — Goal

Web app privado p/ casamento de Gabriely & Gustavo (21 / 11 / 2026, Espaço Eden, Guarapuava PR). 28 convidados nomeados se identificam, escolhem presente da lista curada, pagam via Mercado Pago (Pix | cartão), recebem nota de agradecimento. Casal tem painel admin: CRUD de presentes + métricas de acesso e compra.

## §C — Constraints

- C1: idioma ! pt-BR (voz "nós", tom íntimo, ver design system)
- C2: 28 convidados pré-cadastrados (lista fechada) — self-identify, ⊥ senha
- C3: pagamento ! Mercado Pago — Pix (QR) & cartão de crédito
- C4: dinheiro cai direto em conta do casal (split ⊥)
- C5: design tokens & assets vêm de skill `gabriely-gustavo-wedding-design` (sage/olive, ivory, Cormorant Garamond + Quicksand, florais cropados — ⊥ redesenhar)
- C6: data fixa 21 / 11 / 2026 — app deve ficar no ar antes & permanecer pós-evento
- C7: stack ! Next.js fullstack (App Router, route handlers em `app/api/*`)
- C8: hosting ! Vercel
- C7a: DB ! Airtable (1 base, tabelas `Guests`, `Gifts`, `Purchases`) — viável p/ volume (28 convidados, ~10 gifts, baixa concorrência); ⊥ transações nativas ∴ mitigar race em `claim` via re-check (V3a)
- C7b: pagamento ! Mercado Pago **Checkout Bricks** — Payment Brick (cartão + Pix no mesmo component) + Status Screen Brick; SDK `@mercadopago/sdk-react` no client, MP Node SDK no server
- C9: admin restrito ao casal — auth separada do fluxo de convidado
- C10: ⊥ emoji exceto ♥ (Unicode, em `--blush` | `--olive`)
- C11: preços armazenados em centavos (int)
- C12: formato moeda `R$ 180,00` (vírgula decimal)
- C13: formato data `DD / MM / YYYY` com barras espaçadas

## §I — Interfaces

### Telas convidado
- screen: `/` → identify — nomes casal + data + local + subhead "Selecione seu nome para entrar" + busca+lista convidados (⊥ eyebrows introdutórios)
- screen: `/presentes` → list (grid de gifts, `GiftCard` c/ `claimed/limit`, CTA "Presentear")
- screen: `/presentear/:giftId` → payment (tabs Pix | Cartão, MP checkout)
- screen: `/obrigado` → thank-you (nota manuscrita anima, pétalas, assinatura)

### Telas admin
- screen: `/admin/login` → auth casal
- screen: `/admin/presentes` → CRUD (foto, nome, desc, price, limit, claimed, edit, delete)
- screen: `/admin/convidados` → 28 convidados c/ estado (viewed | purchased | nothing)
- screen: `/admin/metricas` → buckets {presentearam, viram-não-deram, não-viram} + totais (arrecadado, presentes dados)

### API (Next.js route handlers)
- api: `POST /api/identify` {guestId} → 200 {session} → cookie httpOnly
- api: `GET /api/gifts` → 200 [{id,name,desc,price,limit,claimed,photo,tint,soldOut}]
- api: `POST /api/preference` {giftId,guestId} → 200 {preferenceId, publicKey} (cria MP Preference p/ Brick)
- api: `POST /api/process-payment` {paymentData, giftId, guestId} → 200 {status, paymentId, pix?:{qrBase64,qrCode,ticketUrl,expiresAt}} (server-side `payments.create` via MP SDK, chamado pelo Brick `onSubmit`)
- api: `GET /api/payment/status?ref=<externalReference>` → 200 {status} — lê `Purchases.Status` por `IdempotencyKey` (⊥ consulta MP); fonte de verdade = webhook (V12); usado p/ poll do PixPanel
- api: `POST /api/mp/webhook` ← Mercado Pago → confirma & incrementa `claimed`
- api: `POST /api/track/view` {} → log acesso (guest from session)
- api: admin: `GET|POST|PUT|DELETE /api/admin/gifts` (auth required)
- api: admin: `GET /api/admin/metrics` → buckets & totais
- api: admin: `POST /api/admin/login` {user,pass} → cookie

### Airtable schema (base única)
- tbl: `Guests` → {Name:str, Initial:str, GuestKey:str(unique slug), Viewed:bool, FirstViewAt:datetime?}
- tbl: `Gifts` → {Name:str, Description:str, PriceCents:int, Limit:int, ClaimedCount:rollup(Purchases.status=approved), Photo:attachment?, Tint:str, Active:bool}
- tbl: `Purchases` → {Guest:link(Guests), Gift:link(Gifts), MPPaymentId:str(unique), Status:select(pending|approved|rejected), Method:select(card|pix), AmountCents:int, CreatedAt:datetime, ConfirmedAt:datetime?, IdempotencyKey:str(unique)}

### Externos
- ext: Mercado Pago Bricks SDK — `@mercadopago/sdk-react` (client) + `mercadopago` (server)
- ext: MP Payment Brick → cartão + Pix (1 component, 1 fluxo)
- ext: webhook MP → `POST /api/mp/webhook` HTTPS pública (URL configurada no MP dashboard)
- ext: Airtable REST API via `airtable` npm SDK
- env: `MP_ACCESS_TOKEN` ! set (server)
- env: `NEXT_PUBLIC_MP_PUBLIC_KEY` ! set (client, p/ initMercadoPago)
- env: `MP_WEBHOOK_SECRET` ! set (validação x-signature)
- env: `AIRTABLE_API_KEY` ! set
- env: `AIRTABLE_BASE_ID` ! set
- env: `ADMIN_USER`, `ADMIN_PASS_HASH` ! set
- env: `SESSION_SECRET` ! set (assinar cookie guest & admin)

### Assets
- src: `gabriely-gustavo-wedding-design/colors_and_type.css` → copiar p/ `src/styles/tokens.css`
- src: `assets/floral-corner-tl.png`, `floral-corner-br.png`, `floral-border-*.png`, `motif-sprig-heart.png`, `divider-leaf.png`, `invite-formal.png`, `invite-savethedate.png` → copiar p/ `public/assets/`
- src: `ui_kits/wedding-gifts/*.jsx` → referência visual (recriar em stack final, ⊥ copiar Babel-CDN como prod)

## §V — Invariants

- V1: ∀ rota ≠ `/` & ≠ `/admin/*` → guest session ! presente, senão redirect `/`
- V2: ∀ gift → `claimed ≤ limit` — `claimed` derivado de `Purchases.status=approved` (rollup Airtable)
- V3: purchase confirmado (MP webhook OK) → upsert `Purchases` por `MPPaymentId`, status `approved`; ⊥ duplica via unique key
- V3a: criação de `Purchases` (pré-pagamento) ! re-checar `claimed < limit` imediatamente antes do insert; se race → cancelar payment & devolver erro "sold-out"
- V4: guest ∈ 28 lista fechada — ⊥ self-register
- V5: copy ! pt-BR, voz "nós", primeira pessoa plural; admin pode ser mais funcional mas ainda quente
- V6: preços ! int centavos no DB; render via `fmt(cents)` → `R$ X,YY`
- V7: data ! formato `DD / MM / YYYY` (espaços)
- V8: ⊥ emoji decorativa; ♥ permitido como acento de afeto, uso parco
- V9: cores & type ! de `tokens.css` — ⊥ hex hardcoded fora do token file
- V10: florais ! reuso dos PNGs do skill — ⊥ redesenhar SVG novo
- V11: admin rotas ! auth check antes do handler
- V12: webhook MP ! valida assinatura via `MP_WEBHOOK_SECRET` antes de mutar estado
- V13: `POST /api/purchase` idempotente por `(guestId, giftId, mpPaymentId)` — retry ⊥ duplica claim
- V14: gift sold-out (`claimed = limit`) → card dim & CTA disabled; copy "Esse presente já foi todo escolhido com carinho ♥"
- V15: acesso de convidado logado → grava `viewed=true` (track once por guest)
- V16: thank-you screen ! mostra nome do convidado & assinatura "Gabriely & Gustavo"
- V17: motion ! lento e suave (`--dur 240ms`, `--dur-slow 480ms`); ⊥ bounce, ⊥ spring rígido
- V18: hero & ceremonial screens centralizados, narrow; admin left-aligned, gridded
- V19: frame inset 1px `--line-strong` ~24px ! wrap hero cards (assinatura do convite)
- V20: ícones ! Lucide stroke 1.5 sage; ⊥ filled, ⊥ outro set
- V21: Payment Brick `initialization.amount` ! = `gift.priceCents/100`; `payment_methods` ! incluir `creditCard` & `bankTransfer`(pix)
- V22: `MP_ACCESS_TOKEN` ⊥ exposto ao client; only `NEXT_PUBLIC_MP_PUBLIC_KEY` no browser
- V23: Airtable calls ! server-side (route handlers) — API key ⊥ no client bundle
- V24: rate limit Airtable (5 req/s/base) → batch reads onde possível; cache `Gifts` em memória do server por ~10s
- V25: card `/` ! compacto — ⊥ eyebrows introdutórios ("Com muita alegria…", "Quem está chegando?"); conteúdo ! {nomes, data, local, subhead, busca, lista}
- V26: `claimed` ! computado server-side de `Purchases.Status=approved` — ⊥ ler `Gifts.ClaimedCount` (campo ⊥ garantido rollup); ponto único de verdade = `getGifts()`
- V27: filtro por link Airtable ! comparar record-id em JS sobre `fields.<Link>[]` — ⊥ `FIND(id, ARRAYJOIN({Link}))` (ARRAYJOIN devolve primary field, ⊥ id)
- V28: method=pix → resposta de `/api/process-payment` ! carregar {qrBase64, qrCode, ticketUrl, expiresAt} & UI ! renderizar QR + copia-e-cola; `/obrigado` ⊥ destino de pix `pending` ainda ⊥ pago
- V29: branch mock de pagamento ! `NODE_ENV ≠ production` — em prod sem MP creds → 503 explícito, ⊥ grava Purchase approved

## §T — Tasks

```
id|status|task|cites
T1|x|scaffold Next.js App Router + TS + CSS Modules + ESLint|C7
T2|x|copiar tokens.css & assets do skill p/ `public/assets/` & `app/globals.css`|I.src,V9,V10
T3|~|criar base Airtable c/ tabelas `Guests`, `Gifts`, `Purchases` (schema §I) — base & tabelas ok; `ClaimedCount` ⊥ materializou como rollup ∴ substituído por V26|C7a,V2,V3
T3a|x|wrapper server-side `lib/airtable/client.ts` (get/list/insert/update) + cache Gifts|V23,V24
T4|x|seed 28 convidados (de `GUESTS`) & 10 gifts (de `GIFTS`) + script bootstrap|V4,C2
T5|x|identify screen `/` + `POST /api/identify` + session cookie HMAC (Web Crypto)|I.api,V1,V4
T6|x|gift list `/presentes` + `GET /api/gifts` + GiftCard sold-out state|V2,V14
T7|x|payment screen `/presentear/:id` — embed Payment Brick (card + pix) + mock|C7b,V21
T8|x|`POST /api/preference` cria MP Preference server-side & retorna `preferenceId`|C7b,V22
T9|x|`POST /api/process-payment` chamado por `onSubmit` do Brick → `payments.create` MP|C7b,V3a,V22
T10|x|webhook `/api/mp/webhook` valida `x-signature` & upsert `Purchases` p/ `approved`|V3,V12,V13
T11|x|thank-you screen + animação (write-in, petals drifting, signature rise)|V16,V17
T12|x|admin login + proxy auth + ADMIN_PASS_HASH sha256|V11,C9
T13|x|admin presentes CRUD UI + endpoints (soft-delete via Active=false)|I.api,V2
T14|x|admin convidados view (estado viewed/purchased + totalCents/gifts)|V15
T15|x|admin métricas (3 buckets + 4 stats arrecadado/dados/cotas/ativos)|I.screen
T16|x|view tracking via ViewTracker client + `POST /api/track/view` once|V15
T17|x|FloralCorners em `/`, `/presentes`, `/obrigado`; Frame inset em hero|V19,V10
T18|x|copy pt-BR voz "nós" em todas telas (revisado durante implementação)|V5,V8
T19|~|deploy Vercel + env vars + webhook URL no MP dashboard (manual)|C8,I.env,I.ext
T20|~|teste end-to-end fluxo convidado em sandbox MP (manual)|V1-V16
T22|x|home refactor — remover eyebrows introdutórios, manter subhead, compactar hero/divider|V25
T21|~|testar race claim: 2 guests último slot simultâneo (precisa creds reais)|V3a
T23|x|derivar `claimed` de Purchases dentro de `getGifts()` (1 fetch approved → agrupa por giftId) — mata dep de `ClaimedCount`|V2,V14,V26,B1
T24|x|corrigir `countApprovedForGift` → filtrar record-id em JS; manter como re-check anti-race|V3a,V27,B2
T25|~|pix end-to-end — propagar `transaction_data` → `PixPanel` (QR + copia-e-cola + poll status) → /obrigado só após approved|C3,V28,B3
T26|.|gate do branch mock atrás de NODE_ENV; 503 em prod sem MP creds|V29,B4
```

## §B — Bugs

```
id|date|cause|fix
B1|2026-09-14|`Gifts.ClaimedCount` nasceu `number` (rollup do bootstrap falhou & `.catch` engoliu) → nunca escrito → `claimed`=0 ∀ gift → V2/V14 mortos, card ⊥ esgota, métrica "presentes dados"=0|V26,T23
B2|2026-09-14|`countApprovedForGift` usa `FIND(recId, ARRAYJOIN({Gift}))`; ARRAYJOIN devolve primary field (Name) ⊥ record id → sempre 0 → V3a sem teto → over-sell ilimitado|V27,T24
B3|2026-09-14|`payments.create` pix → `pending` + `point_of_interaction.transaction_data` descartado em `/api/process-payment` → guest cai em `/obrigado` sem QR nem copia-e-cola → ⊥ tem como pagar|V28,T25
B4|2026-09-14|`mpConfigured()=false` → branch mock grava `Purchases.Status=approved` real; ⊥ gate por NODE_ENV → prod sem creds = presente grátis|V29,T26
```
