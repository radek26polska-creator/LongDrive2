**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## LongDrive deployment to Render

The backend uses SQLite for local development and PostgreSQL whenever `DATABASE_URL` is set. Production startup fails if `DATABASE_URL` is missing, instead of silently creating a database on Render's temporary filesystem. `render.yaml` defines a separate test deployment: `longdrive-v2-frontend`, `longdrive-v2-backend`, and `longdrive-v2-db`. The backend receives the database connection string from Render; never commit a `.env` file, database URL, password, or JWT secret.

The Blueprint also sets `LONGDRIVE_ALLOWED_ORIGINS` to the exact frontend origin and configures `/api/health` as the backend health check. `VITE_API_URL` is a public frontend build setting and points to the new backend service.

**Temporary test data only:** the Blueprint selects Render's Free plan for its backend and PostgreSQL database. Render Free Postgres expires 30 days after creation. Once expired, it is inaccessible; after a 14-day upgrade grace period, Render deletes it. Free Postgres has no backups, and free web services can spin down when idle. Do not use this configuration for long-term or production accounts. See [Render Free instance limitations](https://render.com/docs/free).

The new database starts empty; registering a new Render Blueprint does not copy any data from the local SQLite database or another Render database. Existing users and fleet records will not appear there. Do not use a production database URL in a test deployment.

For lasting data, switch the database to a paid Render Postgres plan and review its backup options before collecting real account or fleet data. For instructions on Blueprint creation and review, see [Render Infrastructure as Code](https://render.com/docs/infrastructure-as-code).

Each account has at most one active backend session. User sessions are stored in the same database as the account and remain active for up to 24 hours unless the user logs out. The database schema is initialized automatically when the backend starts.

For local development, the backend uses `server/longdrive.db`. Install frontend dependencies with `npm ci` in the project root and backend dependencies with `npm ci` in `server`. The double-click launcher creates an ignored local `server/.env` with a random JWT secret when needed. To start the services manually, copy `server/.env.example` to `server/.env` and replace the placeholder secret first. Start the frontend with `npm run dev` and the backend with `npm start` from `server`.

Run backend tests from the project root with `node --test server/test/*.test.cjs`; run frontend checks with `npm run lint`, `npm run typecheck`, and `npm run build`.
