# Running the dash without the Pi

The whole stack runs on a normal desktop. You get a live dash in a
browser tab, with fake-but-honest data from the bench simulator, and no
Raspberry Pi, no CAN HAT and no car involved.

This is the better loop for UI work. `npm start` reloads the browser the
moment you save a file, where the Pi needs a two-minute `npm run build`
and a kiosk restart to show the same change.

## What works off the Pi, and what does not

| | Desktop | Needs the Pi |
|---|---|---|
| Gauges, warning lamps, shift lights, boot sequence | yes | |
| Settings, edit mode, widget drag and drop | yes | |
| Simulator, fault injection, lamp test | yes | |
| CAN decoder tests | yes | |
| Reading a real KPro over CAN | | yes |
| Android Auto / OpenAuto | | yes |
| Kiosk, systemd units, boot splash | | yes |

## One-time setup

From the repo root. On Windows use Git Bash; the commands are the same
apart from the venv path, noted below.

**Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.txt
```

Seven packages, a few seconds. No database — device preferences live in
a local JSON file.

**Frontend**

```bash
cd frontend
npm install --legacy-peer-deps
```

The legacy flag is needed: React 19 against some older peer ranges.

Then create `frontend/.env` with one line, the same as on the Pi:

```
REACT_APP_BACKEND_URL=http://localhost:8001
```

Without it the frontend asks itself for data instead of the backend, and
every gauge sits at its default — which looks like a healthy idling
engine and is the single most misleading failure in the project.

`backend/.env` is optional on a desktop. `SIGNAL_SOURCE` defaults to
`simulation`, so demo mode is already the default.

## Running it

Two terminals.

```bash
# terminal 1
cd backend && source venv/bin/activate
uvicorn server:app --port 8001 --reload
```

```bash
# terminal 2
cd frontend && npm start
```

A browser opens on `http://localhost:3000`. Boot sequence, then the
dash, with the needles sweeping through the simulator's drive cycle.

Both have hot reload: `--reload` restarts uvicorn when you save a Python
file, `npm start` refreshes the browser when you save a JSX file.

## Driving the simulator

The bench harness exists so every gauge and every warning lamp can be
exercised without an engine. Same endpoints as on the Pi.

```bash
# light every warning lamp at once for 15 seconds
curl -X POST localhost:8001/api/sim/lamp-test \
  -H 'Content-Type: application/json' -d '{"seconds": 15}'

# hold the revs where you can look at the shift lights properly
curl -X POST localhost:8001/api/sim/inject \
  -H 'Content-Type: application/json' -d '{"overrides": {"rpm": 7900}}'

# force an overheat - note this sets the temperature, and the lamp is
# derived from it, the same path the real car will take
curl -X POST localhost:8001/api/sim/inject \
  -H 'Content-Type: application/json' -d '{"overrides": {"coolant_temp_c": 118}}'

# back to the normal drive cycle
curl -X POST localhost:8001/api/sim/clear \
  -H 'Content-Type: application/json' -d '{}'

# what is feeding the dash right now
curl -s localhost:8001/api/source-status
```

Injection is refused with a 409 when the source is not the simulator, so
these cannot be fired at a running engine by accident.

## Tests

The decoder and source tests need no hardware, no network and no running
server:

```bash
cd backend
python3 -m pytest tests/test_hondata_can.py tests/test_source_failures.py -q
```

41 tests, well under a second. Worth running before any push that
touches `hondata_can.py` or `sources.py`.

The other three test files (`test_iteration*.py`, `test_bug_fixes*.py`)
are older HTTP integration tests. They need a live server and they still
reference endpoints that have since been removed or were never built
(`/api/settings`, `/api/dhu/device-event`, `/api/dhu/resize`), so they
will fail for reasons that are not bugs.

## Moving a change to the Pi

Nothing special. Commit, push, then on the Pi:

```bash
git pull
cd frontend && npm run build
sudo systemctl restart frank-kiosk
```

Backend-only changes need just `sudo systemctl restart frank-backend`.

A failed build leaves `build/` broken while `serve` keeps handing it
out, so a blank dash straight after a build is almost always the build
rather than the code. Check that `npm run build` ended with
"Compiled successfully" or "Compiled with warnings" — warnings are fine.
