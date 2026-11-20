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

The question page currently performs transparent keyword retrieval from the Greek and translation fields and displays the matching source passages. It does not yet generate an AI interpretation.

To enable interpretation, deploy a server-side HTTPS function and set:

- `VITE_ASK_BYZANTIUM_AI_ENDPOINT`: its HTTPS URL

The function receives JSON with `question` and a `passages` array. It should return JSON such as:

```json
{ "answer": "A historically cautious interpretation grounded in the supplied passages." }
```

Keep all private model-provider API keys inside the server-side function's secrets, never in a `VITE_` variable. The function should instruct the model not to invent quotations, authors, manuscript shelfmarks, or historical claims beyond the supplied evidence.

## Test before merging

1. Confirm the Netlify deploy preview loads both corpora.
2. Open a poem and check Greek, translation, verse numbering, and witness metadata.
3. Search for a word present in a translation.
4. Ask a question and verify that retrieved passages display their exact references.
5. Only merge this branch into `main` after those checks pass.
