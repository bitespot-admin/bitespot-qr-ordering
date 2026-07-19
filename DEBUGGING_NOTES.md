Bug:
Login page refreshed with ? and never sent POST request.

Symptoms:
- No POST in Morgan
- curl worked
- JWT worked
- Cookies worked

Root cause:
Helmet Content Security Policy blocked inline JavaScript.

Fix:
Move inline JS to external files (or configure CSP).
