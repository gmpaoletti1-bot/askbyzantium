# Ask Byzantium corpus integration

This branch adds a read-only corpus explorer and a question interface that retrieves candidate passages from the Paraenetic Poetry Database.

## Netlify environment variables

In Netlify, open the Ask Byzantium site and go to **Site configuration → Environment variables**. Add:

- `VITE_SUPABASE_URL`: the Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: the project's publishable/anon key

Use the same project URL and public key already used by the Paraenetic Poetry Database. These are browser-facing values; never use a Supabase service-role key in the frontend.

After adding variables, trigger a new deploy.

## Supabase permissions

The public/anon role must have read-only SELECT access, through Row Level Security policies, to the `works`, `texts`, and `verses` tables. Do not grant INSERT, UPDATE, or DELETE to anonymous visitors.

## AI interpretation endpoint

The Ask page uses a server-side Netlify Function at `/.netlify/functions/ask`. It has two stages:

1. **Semantic expansion:** an AI model translates the user's everyday description into broader moral concepts and search terms. For example, a problem with a manager may be reframed through concepts such as conflict, anger, envy, injustice, patience, endurance, or self-control.
2. **Grounded interpretation:** the app retrieves candidate verses from the database and sends only those source passages to the model. The model must distinguish the medieval text from a contemporary reflection and say when the connection is weak.

### Required Netlify secret

Add this environment variable in Netlify:

- `OPENAI_API_KEY`: an API key from an OpenAI API account.

This is a **server-side secret**. Do not prefix it with `VITE_`, do not put it in GitHub, and do not paste it into the frontend. The function uses the `gpt-4o-mini` API model. API usage is billed separately by OpenAI and is not included in a ChatGPT subscription.

The frontend endpoint defaults to `/.netlify/functions/ask`, so no `VITE_ASK_BYZANTIUM_AI_ENDPOINT` variable is required unless you deploy the function elsewhere.

After adding the secret, trigger a new Netlify deploy. If the secret is missing, the page will show a configuration message rather than silently pretending that keyword matching is AI interpretation.

The model is instructed not to invent quotations, authors, manuscript shelfmarks, or historical claims beyond the supplied passages. This is an interpretive aid, not a substitute for scholarly verification.

## Test before merging

1. Confirm the Netlify deploy preview loads both corpora.
2. Open a poem and check Greek, translation, verse numbering, and witness metadata.
3. Search for a word present in a translation.
4. Ask a question and verify that retrieved passages display their exact references.
5. Only merge this branch into `main` after those checks pass.
