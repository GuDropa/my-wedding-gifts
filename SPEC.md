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
- api: `POST /api/preference` {giftId} → 200 {publicKey, amount, giftName, externalReference, mock?} — prepara o checkout (sold-out check + `externalReference`); ⊥ cria MP Preference (V40)
- api: `POST /api/process-payment` {paymentData, giftId, externalReference, method} → 200 {status:approved|pending|rejected (V38), paymentId, statusDetail, pix?:{qrBase64,qrCode,ticketUrl,expiresAt}} (server-side `payments.create` via MP SDK, chamado pelo Brick `onSubmit`; body montado por `buildPaymentBody()` — V37,V39,V41)
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
- V30: Payment Brick `initialization.preferenceId` ! acompanhado de `paymentMethods.mercadoPago` — ⊥ passar preferenceId no fluxo que processa server-side (⊥ carteira MP, guest fica na página)
- V31: pagamento recusado → resposta ! carregar `status_detail` & UI ! traduzir p/ motivo em pt-BR (V5) — "não aprovado" seco ⊥ é diagnosticável nem acionável
- V32: `onSubmit` do Payment Brick ! devolver Promise que **rejeita** em falha (doc oficial) — resolve sempre faz o Brick tratar recusa como sucesso & perder o formulário preenchido
- V33: Brick ! montar com `onReady` sinalizando fim da montagem — loader nosso cai só aí, ⊥ antes (área vazia piscando)
- V34: props do `<Payment>` (`initialization`, `customization`, `onSubmit`, `onReady`, `onError`, `onBinChange`) ! identidade estável (useMemo/useCallback, estado mutável via ref) — são deps do useEffect do wrapper ∴ literal inline = unmount+remount a cada setState, formulário zerado
- V35: `status=submitting` → UI ! indicar processamento & bloquear novo submit até a resposta (`/api/process-payment` = Airtable + MP, segundos) — Brick sozinho ⊥ cobre a espera
- V36: container do Payment Brick ! ≥ ~282px de largura interna ∀ viewport ≥ 320px — padding de página & card ! ceder espaço em breakpoint estreito; abaixo disso o Brick corta campos à direita (CPF, e-mail, CVV) e o toque ⊥ alcança
- V37: pix (`payment_method_id=pix`) → `payments.create` ! enviar `date_of_expiration` = agora + 30 min, ISO c/ offset `-03:00` — ⊥ default MP 24h (MP aceita 30 min…30 dias)
- V38: status MP → `Purchases.Status` ! via `mapPaymentStatus()` único (webhook & `/api/process-payment`): `approved`→approved; `rejected|cancelled|refunded|charged_back`→rejected; resto (`pending|in_process|authorized|in_mediation`)→pending. `/api/process-payment` devolve o status mapeado ∴ cartão `in_process` (em análise) ⊥ vira recusa na UI
- V39: `payments.create` ! levar `additional_info.items` [{id,title,description,quantity,unit_price}] & `additional_info.payer` {first_name,last_name do convidado} — aprovação de cartão & nota de qualidade MP; ⊥ sobrescrever `payer` que o Brick preencheu
- V40: ⊥ criar MP Preference — pagamento é criado no backend (V30) ∴ Preference = chamada morta + latência em toda abertura de `/presentear/:id`
- V41: `transaction_amount` ! = `gift.priceCents/100` do servidor — ⊥ confiar no valor do `formData` do Brick (cliente pode adulterar e pagar menos)
- V42: MP recusa c/ HTTP 200 — só `status`/`statusDetail` dizem o resultado. `lib/mp/status-detail.ts` ! cobrir ∀ `status_detail` da tabela da doc MP ("Consulta sobre o status de um pagamento"): recusa → `paymentRejection()` {title,message} p/ toast; pendência de cartão (`pending_contingency` = CONT, `pending_review_manual`…) → `pendingNote()` em `/obrigado?s=pending&d=<statusDetail>`
- V43: aviso de falha no pagamento ! toast fixo na viewport (`components/Toast`, portal em `body`, `role=alert`) — ⊥ aviso inline acima do Brick, que fica fora da tela de quem tocou em "Pagar"
- V44: falha no submit → client ! pedir nova `externalReference` (`/api/preference`) antes do próximo envio — a anterior já é IdempotencyKey de uma Purchase (V13); reusar devolve o resultado antigo sem nova tentativa no MP
- V45: `onError` do Brick ! derrubar o formulário só em `type=critical`; `non_critical` o Brick mostra no próprio campo
- V46: ∀ campo de texto do convidado → `font-size` ≥ 16px — abaixo disso o Safari do iPhone dá zoom no foco e, sem recarregar a página (navegação client-side), o zoom segue nas telas seguintes
- V47: ≤ 1 Payment Brick vivo por página — montagem própria (`payment-brick.tsx`), cada montagem espera a anterior desmontar (inclusive `create` ainda pendente) e usa container próprio; ⊥ `<Payment>` do sdk-react

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
T25|x|pix end-to-end — propagar `transaction_data` → `PixPanel` (QR + copia-e-cola + poll status) → /obrigado só após approved|C3,V28,B3
T26|x|gate do branch mock atrás de NODE_ENV; 503 em prod sem MP creds|V29,B4
T27|x|corrigir init do Brick (preferenceId, entityType) + propagar `status_detail` c/ copy pt-BR|V5,V30,V31,B5,B6,B7
T28|x|onSubmit rejeita em falha + aviso de recusa acima do Brick (⊥ reload p/ tentar de novo)|V32,B8
T29|x|onReady do Brick controla o loader; Brick faz fade-in ao ficar pronto|V17,V33
T30|x|memoizar props do Brick (identidade estável) + overlay "Confirmando seu pagamento" durante o submit|V34,V35,B9
T31|x|breakpoints 480/360 em `/presentear/:id` — padding de página & card cedem largura p/ o Brick caber inteiro no celular|V36,B10
T32|x|`buildPaymentBody()` em `lib/mp/payment-body.ts` — pix `date_of_expiration` 30 min + `transaction_amount` do servidor + teste|V37,V41,B11,B13
T33|x|`mapPaymentStatus()` em `lib/mp/status.ts` usado por webhook & process-payment; process-payment devolve status mapeado + teste|V38,B12,B14
T34|x|`additional_info` (items + payer) no body do `payments.create` + teste|V39
T35|x|remover `mpPreference().create` de `/api/preference` & `preferenceId` do client|V30,V40,I.api
T36|x|mapear ∀ `status_detail` da doc MP (`paymentRejection`, `pendingNote`) + teste c/ cartões de teste OTHE/CONT/CALL/FUND/SECU/EXPI/FORM|V31,V42,B15
T37|x|`components/Toast` + toast de recusa em `/presentear/:id` (substitui `.notice` inline); CONT → `/obrigado` c/ nota de análise|V43,V17,V20,B15
T38|x|renovar `externalReference` após falha no submit; `onError` só derruba Brick em `critical`|V44,V45,B16,B17
T39|x|copy alinhada à lista nova (lua de mel em Buenos Aires + casa nova + cotas): intro `/presentes`, nota `/obrigado` (aprovado c/ P.S., pendente), dica de pagamento, Pix expirado, meta description; seed espelha os 37 gifts ativos do Airtable; `fmtBRL` c/ ponto de milhar (`R$ 2.000,00`)|V5,V8,C12
T40|x|`/admin/mensagens` — catálogo do que o convidado lê (agradecimento aprovado/pendente c/ link p/ `/obrigado` real, toasts de recusa disparáveis, Pix, esgotado); textos lidos das fontes (`status-detail`, `lib/pix-copy`, `GiftCard`); proxy libera `/obrigado` p/ sessão admin (prévia saúda "Convidado")|V5,V11,V43
T41|x|`PresentesAdmin` importa `fmtBRL` direto (⊥ prop função)|B18
T42|x|agradecimento por presente: campo `Gifts.ThankYou` (Airtable, 37 mensagens escritas) → `/obrigado?id=` usa no meio da nota, vazio → mensagem geral c/ P.S.; editável em `/admin/presentes`, prévia por presente em `/admin/mensagens`; checkout & PixPanel passam `id`|V5,V8
T43|x|busca de nome em `/` c/ 16px (⊥ zoom do iOS)|V46,B19
T44|x|`PaymentBrick` substitui `<Payment>`: 1 instância viva, teardown de `create` pendente, callbacks por ref, `create` sem controller → erro `critical`|V47,B20
```

## §B — Bugs

```
id|date|cause|fix
B1|2026-09-14|`Gifts.ClaimedCount` nasceu `number` (rollup do bootstrap falhou & `.catch` engoliu) → nunca escrito → `claimed`=0 ∀ gift → V2/V14 mortos, card ⊥ esgota, métrica "presentes dados"=0|V26,T23
B2|2026-09-14|`countApprovedForGift` usa `FIND(recId, ARRAYJOIN({Gift}))`; ARRAYJOIN devolve primary field (Name) ⊥ record id → sempre 0 → V3a sem teto → over-sell ilimitado|V27,T24
B3|2026-09-14|`payments.create` pix → `pending` + `point_of_interaction.transaction_data` descartado em `/api/process-payment` → guest cai em `/obrigado` sem QR nem copia-e-cola → ⊥ tem como pagar|V28,T25
B4|2026-09-14|`mpConfigured()=false` → branch mock grava `Purchases.Status=approved` real; ⊥ gate por NODE_ENV → prod sem creds = presente grátis|V29,T26
B5|2026-09-14|`initialization.preferenceId` passado sem `paymentMethods.mercadoPago` → Brick alerta e ignora; preferenceId ⊥ é necessário quando o pagamento é criado pelo nosso backend|V30,T27
B6|2026-09-14|`payer` sem `entityType` → Brick alerta "entityType only receives individual or association"; campo é PSE/Colômbia, mas o Brick valida mesmo assim|V30,T27
B7|2026-09-14|`status_detail` do MP descartado em `/api/process-payment` → toda recusa vira "Pagamento não aprovado" sem motivo; convidado ⊥ sabe o que corrigir, casal ⊥ consegue depurar|V31,T27
B8|2026-09-14|`onSubmit` era `async` c/ catch que engolia o erro ∴ sempre resolvia; Brick tratava recusa como sucesso e a única saída era `location.reload()`, perdendo os dados do cartão|V32,T28
B9|2026-09-15|props do `<Payment>` eram literais inline ∴ nova identidade a cada render; `setStatus("submitting")` dentro do `onSubmit` disparava o cleanup do wrapper (`paymentBrickController.unmount()`) e reinit 200ms depois → formulário voltava zerado no meio do POST; ao resolver, o `router.push` (ou o reject) caía num Brick já descartado → "confirma do nada ou erro do sistema"; sem V35, nada sinalizava a espera|V34,V35,T30
B10|2026-09-15|padding fixo de desktop (16px página + 32px card) deixava só 222px de largura útil num viewport de 320 (262 em 360), contra os ~282px que o Brick pede ∴ 48–61px de cada campo ficavam fora da área visível e fora do alcance do toque — CPF e e-mail, que ficam mais à direita, eram os mais cortados; medido em `#paymentBrick_container` (clientWidth 222 vs scrollWidth 282)|V36,T31
B11|2026-10-14|pix criado sem `date_of_expiration` → default MP 24h → PixPanel conta "1439 : 59" & 2 convidados têm 1 dia p/ pagar o mesmo último slot (`pending` ⊥ conta em `claimed`)|V37,T32
B12|2026-10-14|webhook mapeava todo status ∉ {approved, rejected} → `pending` ∴ estorno (`refunded`) ou chargeback de compra aprovada voltava a `pending` e pix expirado (`cancelled`) ficava `pending` p/ sempre — admin mostra "aguardando" em pagamento morto|V38,T33
B13|2026-10-14|`/api/process-payment` espalhava `formData` do Brick no body ∴ `transaction_amount` vinha do browser — request adulterado pagava qualquer valor e o webhook marcava o presente como dado|V41,T32
B14|2026-10-14|`/api/process-payment` devolvia o status cru do MP; cartão em análise volta `in_process` (⊥ `pending`) → client caía no ramo de recusa, mostrava erro e o convidado podia pagar de novo|V38,T33
B15|2026-10-14|recusa do MP vem c/ HTTP 200 (`{status:"rejected", statusDetail:"cc_rejected_other_reason"}`); o aviso era um `<p>` inline acima do Brick → fora da viewport de quem está no botão "Pagar", recusa parecia "não fazer nada"; mapa cobria só 14 dos 26 `status_detail` de recusa da doc|V42,V43,T36,T37
B16|2026-10-14|`externalReference` reaproveitada após recusa → `/api/process-payment` achava a Purchase `rejected` pela IdempotencyKey e devolvia o `rejected` antigo (sem `statusDetail`) sem chamar o MP → toda nova tentativa "recusava" até recarregar a página|V44,T38
B17|2026-10-14|`onError` do Brick tratava todo erro como fatal → erro `non_critical` (ex.: BIN sem meio de pagamento) trocava o formulário inteiro por "Erro no processamento" e jogava fora o que o convidado digitou|V45,T38
B18|2026-10-20|`/admin/presentes` (server) passava `fmtPrice={(c) => fmtBRL(c)}` p/ `PresentesAdmin` (client) → função ⊥ serializável → página de entrada do admin quebrava logo após o login|T41
B19|2026-10-21|busca de nome em `/` c/ `font-size: 15px` → Safari do iPhone dava zoom no foco; a navegação client-side ⊥ desfaz o zoom ∴ lista & checkout ficavam ampliados ("zoom que não deveria existir")|V46,T43
B20|2026-10-21|no celular, e-mail (Pix), nome do titular & documento mostravam o texto mas o Brick acusava "Dado obrigatório". Diagnóstico pelo bundle do MP (⊥ reproduzido — sem chave pública local): o formulário vive em stores globais do bundle, compartilhadas por toda instância viva; o `<Payment>` só registra `window.paymentBrickController` após o `create` assíncrono ∴ desmontar no meio (rede lenta, voltar à lista) deixava instância órfã escrevendo vazio nas mesmas stores; e `create` c/ falha só logava, tela presa em "Preparando"|V47,T44
```
