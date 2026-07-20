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

## Brave Browser Issue

Symptoms:
- Images not loading
- Eruda not loading
- JS appeared inconsistent
- Chrome and Opera worked correctly

Cause:
Brave Shields blocked required resources/scripts.

Fix:
Turn off Brave Shields for localhost (or the deployed site if necessary).
