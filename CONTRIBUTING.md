# Contributing

Bug reports and pull requests are welcome. For a missed label or logo, include the
page, the expected wording, your browser and extension versions, and whether you
were signed in. Remove account details and private messages from screenshots.

Use Node.js 22 or newer:

```sh
npm ci
npm test
npm run build
npm run lint:firefox
```

Run `npm run preview` for a local fixture that uses the extension's real content
scripts. Changes to replacement rules should preserve tweet bodies, recognized
profile and message fields, editable text, URLs, and event handlers. Add a focused
regression case when fixing a missed label or an overly broad replacement.

Edit `extension/` and `scripts/`; `dist/` is generated. Keep runtime code readable
and self-contained, retain the original-project attribution, and avoid remote code
or extra permissions. Contributions are distributed under the project's MPL-2.0
license.
