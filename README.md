# Juice Journal — FPV Battery Flight Logger (MVP)

Small single-page app to log FPV battery flights.

## Project layout

- `index.html` — app shell and markup
- `css/flight-log.css` — styles
- `js/flight-log.js` — main UI + NFC + logging logic

## Local preview

Serve the folder with a static server (Python, Node, or similar).

Python 3:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Node (http-server):

```bash
npx http-server -c-1 . 8000
```

## Notes

- NFC functionality requires a browser and device that supports the Web NFC API.
- The app posts flight logs to a Google Apps Script endpoint; offline logs are saved to `localStorage`.

If you want different filenames or a module-based structure (`type="module"`), I can rename and adjust imports. Happy to add a simple GitHub Actions workflow or a build step next.