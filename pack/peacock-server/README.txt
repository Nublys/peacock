Server-only config overrides. Harmless on clients (nothing reads this folder there).
On the server, the startup command copies this folder over the server root after each sync:
    cp -r peacock-server/. .
