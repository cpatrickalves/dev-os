# hccr: abre o Claude Code (--remote-control --name <nome>) num terminal do
# herdr-core e dá esse nome à aba do app Herdr.
#
#   hccr <nome> [args do claude...]
#
# Dentro de uma aba do Herdr (HC_TERMINAL_ID definido), roda o claude ali
# mesmo. Num SSH puro, cria um terminal no herdr-core com os rótulos que o app
# usa (herdr.space, herdr.tab), põe o claude nele e faz attach.
#
# Instalação: ~/dev-os/herdr/setup-hccr.sh (faz o ~/.zshrc carregar este
# arquivo). Requer zsh, python3 e `hc` (o herdr-core) no PATH. Escrito contra
# herdr-core 0.1.17: _hc_tab_name grava no doc interno do app.

# Renomeia a aba do app Herdr que contém o terminal $1 para $2. O nome da aba
# vive no doc "herdr-app" do herdr-core (spaces[].tabs[].name); o hc não tem
# comando para isso, então lê e grava o doc pela API (hc connect). Espera até
# $3 segundos a aba aparecer no doc (aba nova que o app ainda não registrou).
_hc_tab_name() {
  python3 -I - "$1" "$2" "${3:-0}" <<'EOF'
import json, subprocess, sys, time
term, new, wait = sys.argv[1], sys.argv[2], float(sys.argv[3])
g = json.loads(subprocess.run(["hc", "get", term, "--json"], capture_output=True, text=True).stdout or "{}")
tab = (g.get("terminal", g).get("labels") or {}).get("herdr.tab")
if not tab:
    sys.exit(1)
p = subprocess.Popen(["hc", "connect"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
n = 0
def call(method, params):
    global n
    n += 1
    p.stdin.write(json.dumps({"jsonrpc": "2.0", "id": n, "method": method, "params": params}) + "\n")
    p.stdin.flush()
    while True:
        line = p.stdout.readline()
        if not line:
            sys.exit(1)
        msg = json.loads(line)
        if msg.get("id") == n:
            return msg
deadline = time.time() + wait
try:
    while True:
        r = call("doc.get", {"name": "herdr-app"})
        if "error" in r:
            sys.exit(1)
        doc, ver = r["result"].get("value") or {}, r["result"]["version"]
        tabs = [t for s in doc.get("spaces", []) for t in s.get("tabs", []) if t.get("id") == tab]
        if tabs:
            if tabs[0].get("name") == new:
                break
            tabs[0]["name"] = new
            r = call("doc.set", {"name": "herdr-app", "value": doc, "version": ver})
            if "error" not in r:
                break
            if (r["error"].get("data") or {}).get("kind") != "conflict":
                sys.exit(1)
            continue
        if time.time() >= deadline:
            sys.exit(1)
        time.sleep(0.5)
finally:
    p.stdin.close()
    p.terminate()
EOF
}

hccr() {
  local name="$1"; shift

  # Já dentro de um terminal do herdr-core (aba do app ou hc attach): roda aqui.
  if [[ -n "$HC_TERMINAL_ID" ]]; then
    [[ -n "$name" ]] && _hc_tab_name "$HC_TERMINAL_ID" "$name"
    claude --remote-control --name "$name" "$@"
    return
  fi

  # SSH puro: cria o terminal no herdr-core, com os rótulos do app, e conecta.
  local root ids tname
  root=$(git rev-parse --show-toplevel 2>/dev/null || print -r -- "$PWD")
  ids=$(HCCR_ROOT="$root" python3 -I -c '
import json, os, secrets, subprocess
def hc(*a):
    return json.loads(subprocess.run(["hc", *a, "--json"], capture_output=True, text=True).stdout)
root, space = os.environ["HCCR_ROOT"], None
for t in hc("ls")["terminals"]:
    g = hc("get", t["address"])
    g = g.get("terminal", g)
    cwd = (g.get("foreground") or {}).get("cwd") or ""
    found = (g.get("labels") or {}).get("herdr.space")
    if found and (cwd == root or cwd.startswith(root + "/")):
        space = found
        break
print(space or "sp" + secrets.token_hex(16), "tb" + secrets.token_hex(16))
') || return 1
  tname=${${(L)name}//[^a-z0-9_-]/-}
  tname=${tname[1,32]}
  hc run --bg --keep --no-parent --no-notify --name "$tname" --cwd "$PWD" \
    --label "herdr.space=${ids%% *}" --label "herdr.tab=${ids##* }" \
    -- zsh -ic 'exec claude "$@"' hccr --remote-control --name "$name" "$@" >/dev/null || return 1
  # A aba só entra no doc quando o app a registra: renomeia em segundo plano.
  [[ -n "$name" ]] && { _hc_tab_name "$tname" "$name" 120 >/dev/null 2>&1 &! }
  hc attach "$tname"
}
