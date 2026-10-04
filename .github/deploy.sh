#!/usr/bin/env bash
# ============================================================
# Deploy der Campus Map per SFTP zu IONOS (läuft in GitHub Actions)
# ============================================================
# Lädt nur Dateien hoch, die sich seit dem letzten Deploy geändert haben.
# Der zuletzt hochgeladene Commit steht auf dem Server in .deploy-sha.
# Fehlt die Datei (erster Deploy) oder ist FULL=true, wird alles hochgeladen.
# Auf dem Server wird nie etwas gelöscht.
#
# Benötigte Umgebungsvariablen (GitHub Secrets):
#   SFTP_HOST      z.B. access-5012345678.webspace-host.com
#   SFTP_USER      z.B. a1234567
#   LFTP_PASSWORD  SFTP-Passwort
#   SFTP_PATH      Zielordner auf dem Server, z.B. /campus-map
# ------------------------------------------------------------
set -euo pipefail

if [ -z "${SFTP_HOST:-}" ] || [ -z "${SFTP_USER:-}" ] || [ -z "${LFTP_PASSWORD:-}" ] || [ -z "${SFTP_PATH:-}" ]; then
    echo "::warning::Deploy übersprungen: SFTP-Secrets fehlen (SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_PATH)."
    exit 0
fi

ZIEL="${SFTP_PATH%/}"
OPEN="set sftp:auto-confirm yes; set net:max-retries 3; set net:timeout 30; open --env-password -u \"$SFTP_USER\" sftp://$SFTP_HOST"

# Was nicht auf den Webserver gehört
AUSSCHLUSS='^(\.github/|\.gitignore$|README\.md$|embed-snippet\.html$)'

DEPLOYED="$(lftp -c "$OPEN; cat \"$ZIEL/.deploy-sha\"" 2>/dev/null | tr -d '[:space:]' || true)"

if [ "${FULL:-false}" != "true" ] && [ -n "$DEPLOYED" ] && git cat-file -e "$DEPLOYED^{commit}" 2>/dev/null; then
    echo "Letzter Deploy: $DEPLOYED – lade nur Änderungen hoch."
    git diff --name-only --diff-filter=ACMRT "$DEPLOYED" HEAD > dateien.txt
else
    echo "Kompletter Upload."
    git ls-files > dateien.txt
fi

grep -Ev "$AUSSCHLUSS" dateien.txt > upload.txt || true

if [ -s upload.txt ]; then
    echo "$(wc -l < upload.txt | tr -d ' ') Datei(en):"
    sed 's/^/  /' upload.txt
    {
        echo "$OPEN"
        awk -F/ -v ziel="$ZIEL" '{
            dir = ziel; for (i = 1; i < NF; i++) dir = dir "/" $i
            if (!(dir in gesehen)) { print "mkdir -p -f \"" dir "\""; gesehen[dir] = 1 }
            print "put \"" $0 "\" -o \"" ziel "/" $0 "\""
        }' upload.txt
    } > upload.lftp
    lftp -f upload.lftp
else
    echo "Keine Dateien für den Webserver geändert."
fi

git rev-parse HEAD > .deploy-sha
lftp -c "$OPEN; put .deploy-sha -o \"$ZIEL/.deploy-sha\""
echo "Fertig: $(cat .deploy-sha)"
