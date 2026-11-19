---
name: stuff-finder-add-item
disable-model-invocation: true
model: haiku
description: Prefill the "add item" form of the stuff-finder webapp (https://stuff-finder.netlify.app/) from a product URL (Amazon, AliExpress, Temu or any shop), EAN/UPC code, model reference or free-text description. Researches the product online, writes French title/brand/price/details, picks a reference and a photo, guesses box and drawer from similar items already stored, then fills the form in the user's Chrome and stops before "Create". Use whenever the user types /stuff-finder-add-item, or asks to add, register or catalogue a product, tool, cable, part or purchase in stuff-finder, even if they only paste a shop link or a barcode.
---

# stuff-finder-add-item

Invocation: `/stuff-finder-add-item <product URL | EAN/UPC | model reference | free-text description>`

Goal: leave the stuff-finder add form fully and correctly prefilled in the user's browser, ready for a human glance, **without clicking "Create"**. Accuracy beats speed: an empty field is better than an invented one, because the user trusts the form and will print a sticker from it.

## Tools

Use the Chrome tools (`mcp__claude-in-chrome__*`), deferred: load them in ONE ToolSearch call:
`select:mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find`

Open two NEW tabs (one shop, one stuff-finder; never reuse the user's tabs), at the end close every tab the skill opened except the form tab (the shop tab and any leftover `chrome://newtab`; check with `tabs_context_mcp`), keep the form tab. WebSearch/WebFetch help for products that are not on a shop page you can open in the browser.

## The plan: 3 batches, about 4 calls in all

Every tool call is a round trip and round trips are most of the runtime, so work in `browser_batch` (its actions run in order in one call). A measured run of the old 35-call flow took 95-105 s, the 8-call flow 58-63 s.

1. **Batch 1, research.** In the shop tab: `navigate` to the product URL, then the extraction script of step 1. Nothing for stuff-finder yet.
2. **Batch 2, similar items.** In the stuff-finder tab, for 2 keywords chosen from the extracted title: `navigate` `/search/<keyword>` then the search script of step 2. This also reveals a missing setup (path `/settings`).
3. **Batch 3, fill and check.** One JS call writes the whole form as a draft in the app's local storage, `navigate` to `/item/add` (the app restores and validates the draft), a JS wait, the verify script, and one small screenshot to look at the photo (step 4).

Only fall back to single calls to retry a failure. Do not take screenshots or call `get_page_text` for anything the scripts below return.

## Step 1 - Research the product (everything in French)

Input triage: a shop URL is the primary source; an EAN/UPC or model is searched on the web; free text is searched then narrowed. If the source is thin, cross-check with other shops, the manufacturer page, and alternative search engines (DuckDuckGo, Bing, Qwant). Trust specific product pages over aggregators. Search the web for an EAN only when the page gives no EAN, UPC or model.

**Pick the extraction by host** (strip tracking query strings first, e.g. AliExpress `?spm=…`; keep the item id): `amazon.*` use the Amazon script, `temu.com` the Temu script, `aliexpress.*` the AliExpress recipe, anything else read the page with `get_page_text` and look for JSON-LD / `og:` tags.

**Amazon extraction** (one `javascript_tool` call). The "Détails de l’article" table is only rendered once its accordion is opened; the script opens it and returns the key fields:

```js
const hdr=[...document.querySelectorAll('a.a-expander-header')].find(e=>/Détails de l’article/.test(e.innerText));
const txt=()=>[...document.querySelectorAll('table')].map(t=>t.innerText.replace(/\s+/g,' ')).find(t=>/ASIN/.test(t))||'';
if(!txt()){hdr?.click();await new Promise(r=>setTimeout(r,800));}
const d=txt(); const g=re=>(d.match(re)||[])[1];
JSON.stringify({title:document.querySelector('#productTitle')?.innerText.trim(),
 brand:document.querySelector('#bylineInfo')?.innerText.replace(/^(Visiter la boutique|Marque\s*:)\s*/i,'').trim(),
 model:g(/Numéro du modèle (\S+)/i)||g(/Numéro de modèle (\S+)/i),
 part:g(/(?:Référence de pièce|numéro de pièce) (\S+)/i),
 upc:g(/\b(?:UPC|EAN|GTIN)\s+(\d{8,14})/), asin:g(/ASIN (\w{10})/),
 price:document.querySelector('#corePriceDisplay_desktop_feature_div')?.innerText.replace(/\s+/g,' ').slice(0,70),
 choose:/Sélectionner/.test(document.querySelector('#twister_feature_div, #twister-plus-inline-twister')?.innerText||''),
 image:(id=>id(document.querySelector('#landingImage')?.getAttribute('data-old-hires'))||id(document.querySelector('#landingImage')?.src)||id(document.querySelector('#altImages img')?.src))(s=>(s||'').match(/images\/I\/([\w-]{8,})\./)?.[1]),
 variant:document.querySelector('#variation_color_name .selection, #inline-twister-expanded-dimension-text-color_name')?.innerText?.trim(),
 bullets:[...document.querySelectorAll('#feature-bullets li')].map(l=>l.innerText.trim().slice(0,100)).slice(0,5)})
```

Rules for this script: the tool output is cut near 1000 characters and the whole result is blocked when it contains URL-like or cookie-like data, so keep it exactly as is (short fields first, long `bullets` last, no free-text dumps). If a call is blocked or a field is empty, re-run only a small expression for the missing part, not the whole script. If `upc`, `model` and `part` are all empty the table layout differs: run a small `matchAll` over the table text. As a last resort use `get_page_text`, then a screenshot of the opened accordion.

`brand` comes from the byline (the table's "Marque" row is followed by arbitrary rows). `part` is the manufacturer part number when there is no model. Never take a barcode from a US listing for a French product.

**Temu extraction** (verified on a `temu.com/goods.html?goods_id=…` page, French locale). No JSON-LD or `og:` tags, and `fetch`/`curl` return no product data, so the browser is required. The title is the `h1`; the gallery photo is the first `<img>` whose `alt` starts with the title (recommendation blocks and the cart icon come first in the DOM, so never take "the first kwcdn image"); the price is the first amount after the title. Temu titles are keyword-stuffed machine translations: build the French Name from the product, not from the title. Temu has no brand, EAN or model: Brand is `Temu` and Reference is the bare goods id (`601099538329317`, already specific enough, no prefix). `Sold by trader` is not a brand.

```js
await new Promise(r=>setTimeout(r,1500));
const h1=document.querySelector('h1')?.innerText.trim(); const t=document.body.innerText;
const g=[...document.querySelectorAll('img')].find(i=>h1&&(i.alt||'').toLowerCase().startsWith(h1.slice(0,15).toLowerCase()));
const after=t.slice(Math.max(0,t.indexOf(h1.slice(0,20)))); const u=g&&new URL(g.currentSrc);
JSON.stringify({title:h1.slice(0,80),price:(after.match(/€\s?\d+[.,]\d{2}|\d+[.,]\d{2}\s?€/)||[])[0],goodsId:new URLSearchParams(location.search).get('goods_id'),
 imgHost:u?.host,imgPath:u?.pathname,variants:/Sélectionner|Select (a )?(size|color|style)/i.test(t),
 details:(after.match(/Product details[\s\S]{0,300}/)||[''])[0].replace(/\s+/g,' ')})
```

Photo URL: `https://<imgHost><imgPath>` (the query string only resizes; the bare path serves the full image, usually 800 px). `price` is in euros with a decimal (`€3.77`), round to whole euros. Ignore `Min. order value` / `Min. to check` banners (`20,00€`): they are not the price. `variants: true` means a size/colour must be chosen: apply the variants rule below. If the page redirects to a login or a bot check, tell the user instead of retrying.

**AliExpress recipe.** The page is client-side rendered: the price is not in the raw HTML, but the share tags are. Two sources:

1. Always works without the browser (verified): `curl -sL -A "Mozilla/5.0" "https://www.aliexpress.com/item/<id>.html"` and read `og:title` (title, ends with `- AliExpress <id>`, strip that suffix) and `og:image` (product photo on `ae-pic-a1.aliexpress-media.com/kf/…jpg`, fetchable). Save the output to a file and grep it, do not dump the page.
2. Price and specs need the rendered page: open `https://www.aliexpress.com/item/<id>.html` in the shop tab and run the script below. The browser tool may refuse the domain ("Navigation to this domain is not allowed"); then do not insist: use the curl data for title and photo and ask the user what they paid (**one question**, with their order amount as the default). The user's order page also shows the exact variant they bought.

```js
await new Promise(r=>setTimeout(r,2500));
const og=p=>document.querySelector('meta[property="'+p+'"]')?.content; const t=document.body.innerText;
JSON.stringify({title:(og('og:title')||document.title).replace(/\s*-\s*AliExpress.*$/,'').slice(0,100),
 price:(t.match(/\d+[.,]\d{2}\s?€|€\s?\d+[.,]\d{2}/)||[])[0],
 variants:/Sélectionner|Choisir|Select/.test(t.slice(0,3000)),
 image:(og('og:image')||'').split('?')[0].replace(/^https?:\/\//,'')})
```

(The browser part of this script is untested: the domain was refused when it was written. Check the result against a screenshot once, and fix the script in this file if it is off.) AliExpress has no EAN: Reference is the bare item id (`1005010137086910`, no prefix) unless the listing gives a model or brand part number. Brand is `AliExpress`: marketplace sellers put famous brands in titles for no-name clones (`Xiaomi –`), so the title's brand is not trusted.

**Photo.** The URL is `https://m.media-amazon.com/images/I/<image>._AC_SL800_.jpg` (800 px). The id must come from the product gallery only (`#landingImage`, or the first thumbnail of `#altImages`). Never pick "the first Amazon image of the page": the cart sidebar and recommendation blocks come first in the DOM and hold other products (a run filled a pull-up bar with the photo of an item in the cart). If `image` is empty, find the gallery with a screenshot of the top of the page.

**Variants and price.** `price` is the whole price block: a range (`44,99€ - 79,99€`) or `choose: true` ("Sélectionner Taille") means the URL has no selected variant, so price and specs belong to no one product. Do not take the lowest price silently. Ask the user which variant they bought and what they paid, or, in a run without questions, fill the lowest value and flag it clearly at the top of the report.

Fields to produce:

| Field         | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**      | Short, generic, French, what you would call it in a drawer: `Ampoule LED E14`, `Câble HDMI 2 m`. No brand, no marketing.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Brand**     | The manufacturer's brand. Temu and AliExpress items: the provider name (`Temu`, `AliExpress`). Otherwise empty if truly no-name; do not guess.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Price**     | Whole euros, digits only (round: 12,90 becomes 13). The price of the selected variant (see above). If prices disagree or none is found, ask the user what they paid.                                                                                                                                                                                                                                                                                                                                                                           |
| **Details**   | Useful secondary specs, comma separated, max 200 chars, e.g. `chaud 3000K, 5W 500lm, non-variable`. Include color, size, capacity, connector, compatibility, variant. Exclude marketing ("basse consommation", "n°1", promos, shop name, brand repeated). Do not write a quantity or spec you cannot read unambiguously (`2 Pcs` in a title may mean 2 tubes or 2 parts). Append up to **2 synonyms** only when the shop or common usage names the item differently, so searching that word finds it (`Serre tube` also called `presse tube`). |
| **Reference** | Must be googleable and specific. Priority: EAN > UPC > manufacturer model > Amazon ASIN or marketplace id (Temu goods id, AliExpress item id, bare digits) > invented. 3 to 50 chars, only letters, digits, `_`, `/`, `-`. A model or part number that is short or generic (`WL0084`, `G-012`, `AP001`, shared by variants or sellers) is too vague alone: write it `<brand>-<model>` (`dabinzhijia-WL0084`, like the user's own `Akynite-G-012`). Invent only as a last resort, as a readable slug, and say it was invented.                  |
| **Photo**     | Product shot URL: white background, squared, 300-900 px. See above. It must be hotlink-fetchable by the app.                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Ask the user **one question at a time**, with short numbered options and a free-text escape, when a required field is still missing after research or you are unsure about a fact (`is it the bluetooth variant?`). Never fill from a guess. Wait for each answer before the next one.

## Step 2 - Similar items and the likely location

Run this script right after each `navigate` to `https://stuff-finder.netlify.app/search/<keyword>` (it polls until the app has loaded, 0.3 s typically, then returns compact results with item ids and the app path, so no `wait` and no `get_page_text`):

```js
const t0=Date.now(); await new Promise(r=>{const i=setInterval(()=>{if(/results? found|Nothing found/.test(document.body.innerText)||Date.now()-t0>6000||location.pathname==='/settings'){clearInterval(i);r()}},100)});
JSON.stringify({path:location.pathname, count:(document.body.innerText.match(/(\d+) results? found/)||[])[1]||0,
 items:[...document.querySelectorAll('a[href^="/item/details/"]')].slice(0,12).map(a=>a.getAttribute('href').split('/')[3]+' | '+a.innerText.replace(/\n+/g,' | '))})
```

- `path: "/settings"`: the app is not set up (Appwrite database, collection and bucket ids missing). Tell the user "stuff-finder needs its settings, fill them in the browser tab and tell me when done", then stop and wait. Never invent or look up credentials. Re-check after the user answers.
- Each item reads `id | BRAND | Name | box letter | drawer NN`. A lone letter without drawer (`S`) is a room box (`Salon`), the first letter of its name.
- Pick 2 discriminating nouns of the object (`fitness`, `ampoule`, `lampadaire`), never words that fuzzy-match half the database (`traction`, `barre`, `radio` returned 55, 5 and 25 mostly unrelated results). A `count` above about 20 is noise.

Decide, using only the truly similar items (same kind of object, drop fuzzy noise):

- **Case A**: most share the same box AND drawer: prefill both.
- **Case B**: most share a box but drawers vary: prefill the box only.
- **Case C**: boxes vary, or nothing similar: leave both empty.
"Most" means a clear majority (roughly 60% or more), not a plurality of two. With fewer than 3 truly similar items, prefill the box at most and leave the drawer empty: one or two data points do not prove where a drawer is, and a bulky item (a pull-up bar) does not fit a drawer that holds small parts. Say it is a weak guess.

**Duplicate by content.** The form only detects an identical reference, but the same product may already exist under another reference (the user's convention is often `Brand-Model`, e.g. `Akynite-G-012`, whereas you may have picked an ASIN). Only when a similar item has the same brand, or a name nearly identical to the product's, open its details (`navigate` to `/item/details/<id>` with the id from the results, then `get_page_text`) and compare specs; other similar items give their location from the results alone, do not open them. If it looks like the same product, STOP before filling the form and ask the user: already in stock (cancel), another pack or variant (new item, reuse the existing reference style), or edit the existing item.

Whenever similar items were found, show a table `Item | Brand | Location`, then one line with the case and what will be prefilled.

Box labels are fixed and must match exactly, e.g. `F (périphériques)`, `G (brico & sport)`, `Salon`. Drawers are `1` to `7`.

## Step 3 - Fill the form with a draft

The app keeps the form in local storage under `stuff-finder-draft-new` and restores and validates it when `/item/add` opens. One JS call replaces eight field fills (faster and no form-state race: filling fields back to back with `form_input` and no pause leaves values that look filled but are empty in the state). In batch 3, in the stuff-finder tab:

1. `javascript_tool`, writing the draft (all keys required; use `''` for empty values, `false` for `isPrinted`): `localStorage.setItem('stuff-finder-draft-new',JSON.stringify({name:'…',brand:'…',price:'12',details:'…',reference:'…',status:'bought',photo:'https://m.media-amazon.com/images/I/<image>._AC_SL800_.jpg',box:'G (brico & sport)',drawer:'2',barcode:'',isPrinted:false,id:''})); 'ok'`
2. `navigate` to `https://stuff-finder.netlify.app/item/add`.
3. `javascript_tool` verify (step 4), then `computer` `screenshot` with `scale: 0.4`.

Field rules the form enforces (write values that pass first time):

| Field                  | Rule                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Name (required), Brand | 1 to 100 characters. Letters, digits, punctuation and symbols are all fine (`+ ' ’ % ( ) : " ° ² × –`), so keep `DAB+`, `d'urgence`, `15"`.    |
| Details                | Same characters, up to 200.                                                                                                                    |
| Name, Brand, Details   | Plain spaces only: no tab or line break, no space at the start or end. Trim, and flatten pasted multi-line text into one comma-separated line. |
| Price                  | Whole euros, digits only, 1 to 5 digits.                                                                                                       |
| Reference (required)   | 3 to 50 characters from letters, digits, `_`, `-`, `/`. No space, dot or other symbol.                                                         |
| Photo                  | Any non-empty URL, no length limit.                                                                                                            |

## Step 4 - Check and fix

The verify script returns the values held by the form state, the first error, and whether a photo loaded (no `read_page` needed):

```js
const t=document.body.innerText; const img=document.querySelector('img[alt="item visual"]');
JSON.stringify({inputs:[...document.querySelectorAll('input[role=combobox]')].map(i=>i.value).slice(0,9),
 error:(t.match(/[^\n]*(already exists|is invalid|is required|too long|too short|not allowed|not fetchable|should not start)[^\n]*/)||[])[0]||null,
 photoLoaded:!!img&&img.complete&&img.naturalWidth>50})
```

`inputs` are, in order, Name, Brand, Price, Details, Reference, Status, Photo, Box, Drawer: compare them with what you meant to write. The error messages are explicit (`Details is too long (230 characters, 200 max)`, `… contains characters that are not allowed : "\t"`): fix exactly what they say by rewriting the draft and reloading `/item/add`.

**Look at the photo** in the screenshot: it must show the product itself. `photoLoaded: true` only says some picture loaded. A different object means a wrong image id: redo the image extraction.

- **Photo not fetchable** (`Image not fetchable` in the page): the image host blocks hotlinking. Try another image URL (other shop, manufacturer, other size). If none works, tell the user to paste an image with Ctrl+V.
- **`Reference already exists`** or **`Barcode already exists`**: do NOT change the reference to dodge it. Open the existing item (`/search/<reference>`, then its details) and compare it with the product.
  - Same product: stop, tell the user which item (name, location, link) and that nothing was added.
  - Different product (reference too short or vague): stop and show both side by side. Let the user choose: new reference, edit the existing item, or cancel.

## Step 5 - Hand over

**Do not click "Create".** The form stays open in the tab. Report briefly, in the user's language:

- One table of the filled fields (name, brand, price, details, reference, photo URL, box, drawer), marking every value you invented, guessed or were unsure of (variant, price range, weak location guess).
- The similar-items table from step 2 if you built one.
- Sources used (URLs).
- "Form ready, check it and click Create."

## Principles

- No hallucinated specs, prices, EANs or photo URLs: every value traces to a page you read or an answer from the user.
- Autonomy first: research, cross-check and try alternative search engines before bothering the user; ask only for what the web cannot give.
- One question at a time.
- Stop and hand over at any real ambiguity (duplicate, unverifiable variant) rather than pushing through.
