# Wie van ons?

Drankspel voor het scoutsweekend. Elke speler dient vooraf 2 anonieme weetjes en 1 "waarheid of leugen" in. Tijdens het spel verschijnen ze op een groot scherm. Iedereen raadt op zijn gsm wie het weetje schreef, of de stelling waar is. Punten worden adfundums.

- Frontend: Vite + vanilla JS, statisch gehost op GitHub Pages (onder `/wie-van-ons/` van deze site).
- Backend: Supabase (Postgres, Realtime, Storage, één Edge Function).

## Routes

| Route | Voor wie |
| --- | --- |
| `#/join` | Gedeelde link voor alle spelers: kies je naam |
| `#/play` | Gsm van een speler (persoonlijke link: `#/play?t=<token>`) |
| `#/tv` | Groot scherm (tv/beamer), read-only |
| `#/admin?key=<admin key>` | Admin (Bent) op de eigen gsm, daarna verder via `#/play` |

## Setup

### 1. Supabase-project

1. Maak een nieuw project aan op [supabase.com](https://supabase.com). De gratis tier volstaat. Kies een regio in de EU.
2. Gebruik een apart project voor dit spel: de migraties gaan uit van een leeg `public`-schema.

### 2. Migraties draaien

Met de [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
cd wie-van-ons
supabase link --project-ref <project-ref>
supabase db push
```

Zonder CLI: plak de bestanden uit `supabase/migrations/` één voor één (in volgorde) in de SQL editor van het dashboard en voer ze uit.

De migraties maken de tabellen, zetten RLS dicht, maken de RPC-functies, seeden de 18 spelers, maken de publieke bucket `avatars` en voegen de `game`-tabel toe aan Realtime.

### 3. Admin key instellen

Kies een lange willekeurige sleutel (bv. `openssl rand -base64 24`) en voer in de SQL editor uit:

```sql
select private.set_admin_key('<jouw-geheime-sleutel>');
```

Alleen de hash wordt opgeslagen. Open daarna `https://bentj.be/wie-van-ons/#/admin?key=<jouw-geheime-sleutel>` op je eigen gsm. De sleutel wordt in `localStorage` bewaard en uit de adresbalk gehaald.

### 4. Edge Function voor foto's

```bash
cd wie-van-ons
supabase functions deploy upload_avatar --no-verify-jwt
```

De functie valideert zelf het speler-token, het bestandstype (JPEG/PNG/WebP) en de grootte (max. 1 MB). `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` zijn automatisch beschikbaar in Edge Functions.

### 5. GitHub-secrets (optioneel)

De workflow bevat de URL en anon key van het huidige project als terugvalwaarde. Voor een ander project zet je in de repo: **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Waarde |
| --- | --- |
| `SUPABASE_URL` | Project URL, bv. `https://abcd1234.supabase.co` |
| `SUPABASE_ANON_KEY` | De `anon` key of de publishable key (`sb_publishable_…`) |

Beide staan in het dashboard onder **Project Settings → API**. Deze sleutels zijn publiek (ze komen in de frontend terecht); alle rechten lopen via RLS en RPC's.

### 6. Deployen

Push naar `main`. De workflow `.github/workflows/deploy.yml` bouwt de portfolio én deze app, en zet de app onder `/wie-van-ons/`. Daarna staat het spel op:

- spelers: `https://bentj.be/wie-van-ons/#/join`
- tv: `https://bentj.be/wie-van-ons/#/tv`

## Lokaal ontwikkelen

```bash
cd wie-van-ons
cp .env.example .env.local   # vul URL en key in
npm install
npm run dev
```

## Spelregels aanpassen

Alle punten en tijden staan in één JSON-object in de tabel `config` (kolom `settings`). Pas het aan in de table editor van Supabase; het spel gebruikt de nieuwe waarden meteen.

| Sleutel | Standaard | Betekenis |
| --- | --- | --- |
| `anon.*`, `truth_lie.*` | zie migratie | punten per situatie (fout, niet gestemd, juist, auteursbonussen, verdachte) |
| `golden_every` / `golden_multiplier` | 10 / 2 | elke 10e vraag is een Gouden vraag, punten x2 |
| `penalty_per_drink` | 5 | strafpunten per adfundum |
| `good_per_give` | 10 | goede punten per uit te delen adfundum |
| `badge_min_streak` / `badge_bonus_good` | 2 / 5 | Hopman-badge: minimale streak en bonus per ronde |
| `reveal_author_delay_seconds` / `reveal_seconds` | 3 / 9 | duur van de onthulling |
| `default_question_count` / `default_vote_seconds` | 30 / 20 | standaardwaarden bij "Start spel" |

## Hoe het werkt

- **Geen directe schrijfrechten.** RLS staat alles dicht. Enkel `game` (status, rondenummer, badgehouder, versieteller) is leesbaar, zodat Realtime werkt. Alle acties lopen via `security definer`-functies die het speler-token of de admin key controleren.
- **Eén leesfunctie.** `get_state(token)` geeft een gesanitized overzicht. Tijdens `question` bevat het nooit de auteur van een weetje, nooit `is_true` van een stelling en enkel het aantal stemmen.
- **Realtime als signaal.** Elke wijziging verhoogt `game.version`. Clients krijgen dat via Realtime binnen en halen dan `get_state` opnieuw op. Bij herverbinden en elke paar seconden als vangnet ook.
- **Timer.** `closes_at` en `phase_until` zijn servertijd. Clients berekenen hun klokverschil met de server en roepen `tick()` aan als een fase verlopen is. De server beslist; enkel de eerste aanroep heeft effect.
- **Volgorde van de vragen** wordt bij de start server-side vastgelegd: zoveel mogelijk verschillende auteurs, nooit twee keer na elkaar dezelfde auteur, max. 2 stellingen na elkaar.
- **Logging.** Alle punten (`point_events`) en adfundums (`adfundum_events`) worden gelogd; tussenstand en eindklassement worden daaruit berekend.

## Bekende beperkingen

- Bij het vrijgeven van een claim of een volledige reset wordt de foto losgekoppeld, maar het bestand blijft in de bucket staan tot dezelfde speler een nieuwe foto uploadt. Verwijder het indien nodig manueel in **Storage → avatars**.
- Eén spel tegelijk, geen laat aansluiten na de start.
