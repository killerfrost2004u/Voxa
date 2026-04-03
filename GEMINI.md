# Voxa Project Context

Voxa is an AI-powered HR recruitment platform that allows candidates to apply via Voice Notes, which are then analyzed by a native multimodal AI (Gemini 2.5 Flash) to evaluate English CEFR levels.

## Tech Stack Rules

### Frontend

- **Strictly Vanilla:** HTML5, CSS3, and Vanilla JavaScript.
- **No Frameworks:** Do NOT suggest or use React, Next.js, Vue, or Angular.
- **State Management:** Rely on standard DOM manipulation and `localStorage` (as seen in `frontend/js/script.js`).

### UI/UX & Design "Skills"
- **Modern Aesthetics:** Use CSS variables (`:root`) for consistent theming. Ensure ample whitespace (`padding`, `gap`), rounded corners (`border-radius: 8px` to `12px`), and subtle `box-shadow` for depth.
- **Responsive Layouts:** Always default to CSS Flexbox or Grid. Ensure mobile responsiveness via `@media` queries (e.g., collapsing 2-column grids to 1-column on mobile).
- **Interactivity:** Add smooth micro-interactions (`transition: all 0.3s ease`) to buttons, cards, and links. Use appropriate `hover` and `active` states.
- **Accessibility & Typography:** Use system fonts or `Inter`. Maintain high text-to-background contrast. Provide user feedback (e.g., loading spinners, success toast notifications) for all form submissions.

### Backend (Python/Flask)

- **Framework:** Flask with `flask-cors`.
- **Database:** PostgreSQL hosted on Neon Cloud. Use `psycopg2` for all queries.
- **Storage:** Cloudflare R2 via `boto3` (S3 API).
- **AI Integration:** Google Generative AI (`gemini-2.5-flash`) using native audio processing (no speech-to-text middleman).

### Coding Standards

1. **Database:** Always use parameterized queries (e.g., `%s`) in `psycopg2` to prevent SQL injection. Always ensure database connections and cursors are closed in a `finally` block or after use.
2. **Error Handling:** API routes must return clean JSON error messages and proper HTTP status codes.
3. **Temporary Files:** Any media downloaded temporarily to the server (e.g., from Cloudflare) must be cleaned up (`os.remove()`) immediately after AI processing.

When assisting with this project, always prioritize lightweight, dependency-free solutions that align with the existing architecture.
