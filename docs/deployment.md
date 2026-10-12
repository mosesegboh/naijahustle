# MongoDB, GitHub and Heroku

## Live application

- Game: https://naija-hustle-72a844a10d13.herokuapp.com/
- Heroku app: `naija-hustle`, EU region, Heroku-24, one Eco web dyno.
- Pipeline: https://dashboard.heroku.com/pipelines/311c1b37-5261-4a15-bb1f-b182b41f8e2a
- GitHub: `mosesegboh/naijahustle`, automatic deployment from `master`.
- **Wait for CI to pass before deploy** is enabled. Pull-request review apps and Heroku CI are disabled; tests run in GitHub Actions.
- Atlas connection details are configured privately in Heroku Config Vars. No database credentials belong in Git.

Eco uses the account's existing shared subscription allowance and sleeps when idle.
The initial deployment was verified with `GET /api/health` returning HTTP 200 and
`{"ok":true}`, confirming the live server can reach Atlas.

For subsequent releases, finish work on a feature branch, integrate it into `develop`,
then promote the tested code into `master` and push `master` to GitHub. Heroku builds
and releases that commit after CI passes. Pushing a feature branch or `develop`
does not deploy production. Branch protection has not been configured.

Check deployment progress in the Heroku app's **Activity** tab and GitHub **Actions**.
Use `heroku logs --tail -a naija-hustle` for runtime logs. The local `heroku` Git remote
is configured, but use GitHub as the normal deployment route so the CI gate applies.

## Setup order for another environment

1. Configure MongoDB and validate the application locally.
2. Push the tested feature branch to GitHub.
3. Set up a Heroku app, database connection and public origin.
4. Deploy the selected GitHub branch, or push a tested local commit to Heroku.

The application now uses MongoDB for accounts, password hashes, seven-day sessions,
challenge state, earned coins, reward history and online presence. Session cookies
contain random secrets; only their SHA-256 hashes are stored in MongoDB. Expiry is
checked on every lookup and TTL indexes remove expired records. Logging out revokes
the current session. Restarts do not require a new login or discard the saved fight.
Fight time continues while disconnected, so an abandoned fight can end in defeat.

One atomic, revision-checked account update saves a fight result, its coin reward
and ledger entry together. Competing stale requests receive HTTP 409 and must reload
or retry. Client-supplied damage and reward amounts are never trusted. This is an
initial game ledger; conversion, exchange-rate administration and withdrawals are
still disabled. The exploration wallet, missions and guest profile remain local to
the browser and are not account coin balances.

Heroku supports cookie sessions, but its dyno memory and writable filesystem do not
provide durable session storage. MongoDB supplies that persistence. The Node server
serves both the built website and `/api` using Heroku's `PORT`, with `0.0.0.0` as its
default host. `Procfile` runs `npm start`; the Node buildpack runs the root `build`
script. Node 22 is selected in `package.json` and `.nvmrc`.

## Local development / Ubuntu

```sh
nvm use
npm ci
cp .env.example .env
docker compose up -d mongo
npm run dev
```

The local Docker database binds only to localhost and persists in a named volume.
Local development and CI use MongoDB 7.0 because MongoDB 8 has a
[documented incompatibility with some recent Linux kernels](https://jira.mongodb.org/browse/SERVER-125742).
The application also supports hosted MongoDB 8 on a compatible managed platform.
For an existing MongoDB server or Atlas, set `MONGODB_URI` in `.env` instead of
starting Docker. `MONGODB_DB` defaults to `naija_hustle`; this setting selects the
database even if the URI includes a database name. `.env` and local data are ignored
by Git. The old JSON file is no longer read; keep any existing `data/accounts.json`
backup for a deliberate migration before switching an installation with real users.

For a local preview of the production entrypoint:

```sh
npm run build
npm start
```

Open `http://localhost:3001`. Keep `NODE_ENV` unset locally. Production requires HTTPS.
For Ubuntu, clone the repository, check out the desired branch and follow the same
setup. A public Ubuntu deployment additionally needs a service manager, HTTPS reverse
proxy and protected database access; GitHub publication alone does not provision it.

## Heroku setup

Create your Heroku app and choose its paid/runtime plan in the dashboard. Use the
Node.js buildpack. Provision a hosted MongoDB database (for example MongoDB Atlas),
create an application database user and permit connectivity from the hosting network.
Choose a network access configuration appropriate to your hosting plan; do not
publish database credentials or put them in the repository.

Set these under **Settings → Config Vars**:

| Variable      | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| `MONGODB_URI` | Your hosted MongoDB connection string, including credentials |
| `MONGODB_DB`  | `naija_hustle`                                               |
| `NODE_ENV`    | `production`                                                 |
| `WEB_ORIGIN`  | Exact HTTPS application origin, without a trailing slash     |

Do not copy localhost `HOST`, `PORT` or database values into Heroku. Heroku provides
`PORT`. Set `WEB_ORIGIN` to the actual domain shown by Heroku, or your configured
custom domain. Startup refuses a missing database or non-HTTPS production origin.
The MongoDB user needs permissions to read/write the database and create indexes.

In **Deploy → GitHub**, connect `mosesegboh/naijahustle`, select the branch and use
**Deploy Branch**. Enable automatic deploys and **Wait for CI to pass before deploy**
once the GitHub checks are green. The initial publication branch is
`feat/mongodb-heroku`; production now follows `master`. The normal promotion sequence is feature → develop → master.
Promotion and branch protection are separate GitHub actions, not automatically
configured by the workflow file.

For a separate app without GitHub integration, direct CLI deployment is also possible:

```sh
heroku git:remote -a YOUR_EXISTING_APP_NAME
npm test
npm run build
git push heroku HEAD:main
heroku logs --tail -a YOUR_EXISTING_APP_NAME
```

Deploy committed code. A direct Heroku Git push does not run the GitHub CI gate.
Use `GET /api/health` to check database connectivity after deployment, then register,
sign in from two browser profiles, win a challenge and restart the dyno. Confirm that
login and coins survive. The existing live app is listed above; these instructions do not provision additional apps automatically.

## Validation and initial hosting limits

```sh
npm test
npm run build
npm run format:check
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm run test:smoke
```

The database tests exercise the real MongoDB adapter. The smoke test launches the
production HTTP server, checks its built assets and secure cookies, restarts it and
checks that the account and fight remain accessible. It creates uniquely named
`naija_test_*` databases and drops only those databases afterward; use a development
MongoDB account permitted to create/drop test databases. GitHub Actions starts MongoDB
and runs these tests on pushes and pull requests.

Start with one web dyno. Accounts, sessions, fights and presence use shared MongoDB,
but rate limits are still per process and fleet load testing has not been done.
Presence polls every 500 ms and fights every 200 ms; scale testing and polling/network
optimization are needed before larger launches. NPCs and traffic remain client-side.
The embedded reward ledger grows with play and will need an archival/separate ledger
design before a high-volume economy. Password reset and account recovery are pending.

References: [Heroku Node support](https://devcenter.heroku.com/articles/nodejs-support),
[Heroku ephemeral storage](https://help.heroku.com/K1PPS2WM/why-are-my-file-uploads-missing-deleted-from-the-application),
[MongoDB atomic operations](https://www.mongodb.com/docs/drivers/node/current/crud/compound-operations/),
[MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/).
