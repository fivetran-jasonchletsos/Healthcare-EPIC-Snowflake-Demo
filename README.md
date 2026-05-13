# Healthcare EPIC Snowflake Demo

End-to-end Epic Clarity → Snowflake → dbt → React demo showcasing the modern
data stack on a healthcare data model. Forked from `Healthcare-Epic-MDLS-DuckDB`
with the MDLS/Iceberg/DuckDB tier replaced by Snowflake.

```
   ┌─────────────────────────────────────────────────────────┐
   │  Epic Clarity (SQL Server on AWS EC2)                   │
   │  patient, pat_enc, pat_enc_dx, hsp_account, …           │
   └──────────────────────────┬──────────────────────────────┘
                              │  Fivetran CDC connector
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Snowflake — raw landing                                │
   │  database: JASON_CHLETSOS_EPIC                          │
   │  schema:   JASON_CHLETSOS_EHR_DEMO                      │
   └──────────────────────────┬──────────────────────────────┘
                              │  dbt run (Snowflake adapter)
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Snowflake — gold layer                                 │
   │  schemas: STAGING / INTERMEDIATE / CLINICAL / FINANCIAL │
   │  marts:   dim_patients, dim_providers, fct_encounters,  │
   │           fct_diagnoses, fct_account_summary, …         │
   └──────────────────────────┬──────────────────────────────┘
                              │  build_snapshot.py → JSON
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │  React + Vite SPA (GitHub Pages)                        │
   │  Home · Patients · Patient detail · Dashboard · Map ·   │
   │  Ask AI agent · Pipeline health · About                 │
   └─────────────────────────────────────────────────────────┘
```

## Layout

| Path | Purpose |
| --- | --- |
| `infra/` | Terraform for the SQL Server EC2 + Fivetran connector |
| `scripts/` | Source data generators + sync triggers + snapshot builder |
| `transform/` | dbt project — Snowflake adapter |
| `healthcare-app/frontend/` | React SPA (mirrors fivetran-sheetz-demo) |
| `healthcare-app/backend/` | FastAPI service for local dev (queries Snowflake) |
| `.github/workflows/` | Pages deploy + scheduled Snowflake-driven snapshot refresh |

## Pipeline

1. Source: SQL Server on EC2 holds an Epic Clarity-shaped schema
   (`patient`, `pat_enc`, `pat_enc_dx`, `hsp_account`, …).
2. Fivetran connector (SQL Server CDC) lands changes into Snowflake under
   `JASON_CHLETSOS_EPIC.JASON_CHLETSOS_EHR_DEMO`.
3. dbt builds the staging → intermediate → marts layers under
   `JASON_CHLETSOS_EPIC.{STAGING, INTERMEDIATE, CLINICAL, FINANCIAL}`.
4. `scripts/build_snapshot.py` queries the marts and writes the JSON the
   React frontend serves at runtime.

## Local development

```bash
# Provision SQL Server + load demo data
cd infra && terraform apply
cd ../scripts && python load_to_sqlserver.py

# Trigger Fivetran sync
python trigger_fivetran_sync.py

# Build dbt models in Snowflake
cd ../transform
export $(cat ../.env | xargs)
dbt deps && dbt run && dbt test

# Build the JSON snapshot from Snowflake marts
cd ../scripts
python build_snapshot.py

# Run the frontend
cd ../healthcare-app/frontend
npm install && npm run dev
```
