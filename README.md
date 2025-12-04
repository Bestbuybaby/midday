# Midday
* https://midday.ai/

This document provides the complete setup instructions for running the Midday project locally. It covers how to run each of the following app folders:

- /apps/api (Backend API endpoints)
- /apps/dashboard (Admin panel)
- /apps/website (Frontend UI)

---

## /apps/api

Follow these steps to run the `/api` backend locally.

### 1) Install Bun (if not installed)

The entire project runs on Bun. If Bun is already installed, skip this step.

```yml
npm install -g bun
```

### 2) Run the API

Navigate to the /api directory:
```yml
cd apps/api
```
Then run:
```yml
bun dev
bun install
```


### 3) Run the Dashboard

Follow these steps to run the /dashboard locally.

Navigate to the folder:
```yml
cd apps/dashboard
```

Then run:
```yml
bun install
bun dev
```


### 4) Run the Website

Follow these steps to run the /website locally.

Navigate to the folder:
```yml
cd apps/website
```

Then run:
```yml
bun install
bun dev
```


## .env for /apps/website

Ensure the following environment variables exist inside the /website directory:
```yml
UPSTASH_REDIS_REST_TOKEN=(Your value here)
UPSTASH_REDIS_REST_URL=(Your Link here)
RESEND_API_KEY=(Your value here)
```


## .env for /apps/dashboard

Ensure the following environment variables exist inside the /dashboard directory:
```yml
NEXT_PUBLIC_SUPABASE_URL=(Your value here)
NEXT_PUBLIC_SUPABASE_ANON_KEY=(Your value here)
NEXT_PUBLIC_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3003
SUPABASE_SERVICE_KEY=(Your value here)

# Resend
RESEND_API_KEY=(Your value here)

# Upstash
UPSTASH_REDIS_REST_URL=(Your value here)
UPSTASH_REDIS_REST_TOKEN=(Your value here)

# OpenPanel
NEXT_PUBLIC_OPENPANEL_CLIENT_ID=(Your value here)
OPENPANEL_SECRET_KEY=(Your value here)

# Webhook
WEBHOOK_SECRET_KEY=(Your value here)

# Engine
ENGINE_API_KEY=(Your value here)
ENGINE_API_URL=(Your value here)

# Polar
POLAR_ACCESS_TOKEN=(Your value here)
POLAR_ENVIRONMENT=sandbox

```


## .env for /apps/api

Ensure the following environment variables exist inside the /api directory:
```yml
# Resend
RESEND_API_KEY=(Your value here)

# Supabase
SUPABASE_JWT_SECRET=SdsBBfyFNy0dklp7hHZv5ZnL8jSyjSa+3NVIu4Eeadi+LlE8KT7sDO2nbria1HsMRZ5e+VibZrSiKvrVxVDBbw==
SUPABASE_SERVICE_KEY=(Your value here)
SUPABASE_URL=(Your value here)
REDIS_URL=(Your value here)

# LLMS
OPENAI_API_KEY=(Your value here)

# Config
ALLOWED_API_ORIGINS="http://localhost:3001"
LOG_LEVEL=debug
MIDDAY_DASHBOARD_URL="http://localhost:3001"

# Polar
POLAR_ACCESS_TOKEN=(Your value here)
POLAR_ENVIRONMENT=sandbox

# Environment
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379
```



---
You have been provided with the .env keys that require actual values. To fill them in, visit the respective service providers—such as Vercel for deployment keys, Resend for email keys, or Supabase for database credentials. Each variable already indicates where its value should come from. Once all required values are added correctly to your .env files, run bun dev for each app. After that your project will be ready to run locally on your machine.
