# grill-with-ui on a remote machine

`grill-with-ui` serves its page on `127.0.0.1` of the machine where Claude Code runs. When that machine is a server you reach over SSH, the browser on your laptop cannot see it until a port is forwarded. This guide sets that up once, with no editor in the loop.

## How the server picks a port

Without `--port`, `serve` tries the port the session used last time, then the first free port of `GRILL_PORTS`, and only then a random one:

| `GRILL_PORTS` | Behavior |
|---------------|----------|
| unset | `4700-4704`: up to five grills at once on known ports |
| `5000-5009` | any range of at most 100 ports, or a single port |
| `0` | a random port per grill (the upstream behavior) |

If every port in the range is taken, the server falls back to a random port and warns on stderr that the fixed forward will not cover it.

## Forward the ports from your laptop

Forwarding is set up on the SSH **client** (your laptop). The server needs no change: OpenSSH allows TCP forwarding by default (`AllowTcpForwarding yes`).

Add an alias to your shell profile (`~/.zshrc` on macOS), replacing the user and host:

```bash
alias grill-tunnel='ssh -fN -o ExitOnForwardFailure=yes \
  -L 4700:127.0.0.1:4700 -L 4701:127.0.0.1:4701 -L 4702:127.0.0.1:4702 \
  -L 4703:127.0.0.1:4703 -L 4704:127.0.0.1:4704 \
  user@server'
```

Then:

1. Run `grill-tunnel` once. `-f` sends SSH to the background and `-N` opens no shell, so the tunnel stays up after the command returns.
2. Start a grill on the server as usual (`/grill-with-ui ...`).
3. Open the URL the agent prints (`http://127.0.0.1:4700/`, or `4701`, ...) in your laptop's browser.

To close the tunnel: `pkill -f "4700:127.0.0.1:4700"`.

### Other ways to set up the same forward

- **Inside the SSH session you already open:** add the same `-L` flags to your usual `ssh` command. The tunnel then lives and dies with that session.
- **`~/.ssh/config`:** put one `LocalForward 4700 127.0.0.1:4700` line per port under a dedicated `Host grill-tunnel` entry and run `ssh -fN grill-tunnel`. Use a dedicated host, not the one you log in with: otherwise every new connection to that host (editor, second terminal) tries to bind the same ports and warns that they are in use.
- **Always on:** `autossh -M 0 -fN ...` (`brew install autossh`) with the same flags reconnects after sleep or a network drop.

## Gotchas

- **Keep the port number the same on both ends.** The server answers only requests addressed to `localhost:<its own port>` (a guard against DNS rebinding), so forwarding laptop port `8080` to server port `4700` gets every request refused.
- **"Address already in use" when connecting:** another tunnel (or a VS Code forward) already holds the port on the laptop. The connection still works without forwarding that port; close the other forward or use the tunnel that is already up.
- **Do not serve on the server's public IP** (`--host <public-ip>`). It works, but the page is then on the internet over plain HTTP, with the access token in the URL in clear text.
