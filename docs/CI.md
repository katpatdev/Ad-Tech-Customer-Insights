# CI Outline

Suggested pipeline (GitHub Actions):

1. Checkout
2. Backend: `pip install -r backend/requirements.txt` + `ruff check` / `pytest` (add tests later)
3. Frontend: `npm ci` + `npm run build`
4. Optional smoke: start compose, curl `http://localhost:8000/health`

Not wired as a workflow file in this MVP — kept as documentation for production readiness.
