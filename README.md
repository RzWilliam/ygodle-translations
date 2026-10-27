# YGOdle translations

Community translations for [YGOdle](https://www.ygodle.net), the daily Yu-Gi-Oh! card guessing game.

Every merged change here goes live on the site at its next deployment. No coding knowledge needed: you only edit JSON text files.

> 🇫🇷 **Francophones :** les contributions se font de la même manière. Le fichier à modifier est [`locales/fr.json`](locales/fr.json).

## How it works

```
locales/
  en.json   ← source language (do not edit here, it is synced automatically from the game)
  fr.json   ← French
  …         ← one file per language
languages.json  ← list of languages published on the site
```

- `en.json` is the reference: every other file has the **same keys**, only the values change.
- A missing key is not a problem: the site shows the English text instead. A partial translation is welcome.
- Card **names** and **descriptions** are not translated here: they come from the official card database.

## Improve an existing translation

1. Open the language file (e.g. [`locales/fr.json`](locales/fr.json)) and click the ✏️ **Edit** button on GitHub.
2. Change the text on the right side of `"key": "text"`.
3. Click **Propose changes** and open a pull request.

## Add a new language

1. Copy `locales/en.json` to `locales/<code>.json`, where `<code>` is the [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) of the language (`de`, `es`, `it`, `pt`…).
2. Set `language.name` to the name of the language **in that language** (`Deutsch`, `Español`…). It is what players see in the language picker.
   Set `language.flag` to the country code of the flag shown next to it (`de`, `es`, `br`…, see the [flag-icons list](https://flagicons.lipis.dev/)).
3. Translate the values.
4. Add the code to `languages.json`.
5. Open a pull request. It is fine to submit a partial translation and complete it later.

## Rules for translators

| In English | Rule |
|---|---|
| `{{series}}`, `{{count}}`… | **Placeholders**: keep them exactly as is (you can move them in the sentence). |
| `<strong>…</strong>`, `<a>…</a>` | **Tags**: keep them and translate the text between them. |
| `guessCount_one` / `guessCount_other` | **Plurals**: `_one` is the singular, `_other` the plural. Add `_few`, `_many`… if your language needs them ([rules per language](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)). |
| `"steps": [ … ]` | **Lists**: keep the same number of items. |
| `cardValues.*` | **Card vocabulary** (attributes, types, Spell/Trap icons): use the **official TCG terms** of your language, as printed on the cards. Keep the **keys** (left side) in English. |

`cardValues.typeFormat` describes how a card type is built: `{{words}}` is replaced by the translated words of the type (e.g. `Synchro Tuner Effect`). Put it before or after the word "Monster" depending on your language: `"Monstre {{words}}"` in French gives `Monstre Synchro Syntoniseur à Effet`.

## Check your file locally (optional)

Every pull request is checked automatically. To run the same check on your machine (Node.js 18+):

```sh
node scripts/check-locales.js --no-code --locales locales
```

It reports invalid JSON, keys that don't exist in `en.json` and broken placeholders or tags. Missing translations are only warnings.

## Credits

Thanks to every contributor! Yu-Gi-Oh! is a trademark of Konami. YGOdle is a fan project and is not affiliated with Konami.
