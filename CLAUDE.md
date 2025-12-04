# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Partner Reports is a Next.js 15 application for generating and sending automated marketing reports to agency partners. It integrates with Google Sheets (partner data), ClickUp (task tracking), Gemini AI (content generation), Gmail (email delivery), and Typeform (feedback collection).

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Configuration

All API integrations require environment variables in `.env.local`. Copy from `.env.local.example`:

```bash
cp .env.local.example .env.local
```

**Critical**: The application will not function without properly configured:
- Google OAuth credentials (user authentication)
- Google Service Account (Sheets API access)
- Gmail API credentials (email sending)
- ClickUp API key (automatic folder discovery)
- Gemini API key (AI content generation)
- Gemini Model (optional - defaults to `gemini-1.5-flash` for stable performance with better rate limits)
- Typeform form ID (feedback collection)

### Gemini AI Configuration

The Gemini model can be configured via the `GEMINI_MODEL` environment variable:

**Available models:**
- `gemini-1.5-flash` (default) - Fast, cost-effective, stable with good rate limits
- `gemini-1.5-pro` - More capable but slower and more expensive
- `gemini-2.0-flash-exp` - Experimental model with advanced features but lower rate limits

**Important Notes:**
- Use simple model names without `-latest` suffix for v1beta API compatibility
- Experimental models (`gemini-2.0-flash-exp`) have significantly lower free tier limits
- If you encounter 429 errors (quota exceeded), the model defaults to `gemini-1.5-flash` for better stability
- Free tier limits reset per minute

### ClickUp Integration

**Dynamic List Discovery**: The system automatically fetches all lists from your ClickUp workspace (Space ID: 44577616) and matches them to partners using smart matching strategies:

1. **Exact match** - List name matches partner name (case-insensitive)
2. **Normalized match** - Removes special characters and spaces
3. **Partial match** - List name contains partner name
4. **Reverse partial** - Partner name contains list name
5. **Prefix match** - Handles lists like "[PB] Bonita-sklep-pl" matching "Bonita-sklep-pl"
6. **Fallback** - Uses `CLICKUP_LIST_MAPPING` env variable if set

**How It Works**:
- Fetches all folders from the workspace
- For each folder, fetches all lists
- Includes folderless lists from the space
- Caches results for 5 minutes to reduce API calls

**Debugging**: Visit `/api/clickup/folders` (authenticated) to see all discovered lists and their IDs.

**Manual Override** (optional): If automatic matching fails, you can set `CLICKUP_LIST_MAPPING`:
```json
{"Partner Name": "list_id_override"}
```

The system tries automatic discovery first, then falls back to manual mapping.

**Note**: Partner tasks are fetched from ClickUp **Lists**, not folders. Each partner should have their own list in your ClickUp workspace.

## Architecture

### Data Flow

1. **Authentication**: NextAuth.js with Google OAuth restricted to `@vsprint` domain
   - Domain check in `lib/auth.ts:12-20`
   - Session strategy: JWT

2. **Partner Data Pipeline**:
   - Google Sheets → `SheetsService` → Partner interface (46 fields)
   - Sheet tabs named in `MM.YYYY` format (e.g., "11.2024")
   - Reads columns A-AR (44 columns) starting from row 2

3. **Report Generation Flow**:
   - User selects partner → Frontend fetches from `/api/partners`
   - User fills form → POST to `/api/reports/{monthly|weekly|opinion}`
   - Backend fetches: Partner data (Sheets) + Tasks (ClickUp)
   - AI generates content → Gemini API
   - Email sent → Gmail API

### API Services Architecture

All services in `lib/api/` are singleton instances:

- **SheetsService** (`sheets.ts`):
  - Maps 44 columns (A-AR) to Partner interface
  - Auto-selects current month sheet if not specified
  - Helper: `getSheetNameForDate()` for historical data

- **ClickUpService** (`clickup.ts`):
  - Fetches closed tasks within date range
  - Requires folder mapping in env
  - Filters for "closed" or "complete" status

- **GeminiService** (`gemini.ts`):
  - Uses `gemini-2.0-flash-exp` model
  - Two prompt types: monthly (narrative) and weekly (bullet points)
  - Combines ClickUp tasks + user input

- **GmailService** (`gmail.ts`):
  - OAuth2 with refresh token
  - Base64-encoded RFC 2822 format
  - Sends HTML emails

### Component Structure

**Main Page** (`app/page.tsx`):
- Tab interface with 3 report types
- Protected by session check
- Loads partners on mount

**Report Tabs** (`components/`):
- `MonthlyReportTab`: 3 text fields (achievements, challenges, plans)
- `WeeklyReportTab`: 1 text field (actions performed)
- `OpinionRequestTab`: Simple partner selection + send

**Email Templates** (`lib/templates/email.ts`):
- HTML with inline styles (no external CSS)
- Monthly: gradient header (purple), metrics grid, AI content
- Weekly: gradient header (blue), quick metrics, actions list
- Opinion: gradient header (pink), clickable star ratings (1-5)

### Opinion Submission Flow

1. Email sent with unique token
2. Star click → `/api/opinion/submit/[token]?stars=N`
3. Token validated, rating saved to Google Sheets, marked as used
4. User redirected to Typeform with pre-filled hidden fields (rating, email, partner)
5. User sees Typeform, can add comments, clicks Submit
6. Typeform saves the response

**Note**: Typeform API does not support programmatic response creation - users must submit through the actual form interface. Hidden fields are used to pre-populate data.

### Type System

All TypeScript interfaces in `types/index.ts`:
- `Partner`: 46 fields matching Google Sheets columns
- `ClickUpTask`: Minimal task data with status/dates
- `ReportData`: Combined data structure for report generation
- Input types for each report form

## Key Technical Details

### Google Sheets Column Mapping
The application expects **exactly 44 columns** in a specific order (A-AR). Column mapping is hardcoded in `lib/api/sheets.ts:4-49`. If sheet structure changes, update `SHEET_COLUMN_MAPPING` and the `Partner` interface together.

### Date Handling
- Monthly reports: Previous full month (uses `getPreviousMonthRange()`)
- Weekly reports: Last 7 days (uses `getLastWeekRange()`)
- All dates in `lib/utils/dates.ts` use Polish locale

### Authentication & Gmail Integration

**NextAuth with Gmail Scope**:
- Users authenticate via Google OAuth (`lib/auth.ts`)
- Authorization requests **both** profile info AND Gmail send permission
- Refresh token automatically stored in session
- No separate Gmail token setup needed

**How it works**:
1. User logs in → Google asks for profile + Gmail send permission
2. NextAuth stores refresh token in JWT session
3. API routes access `session.refreshToken`
4. GmailService uses this token to send emails **from user's Gmail account**

**Important**: Each user sends emails from their own Gmail. If user revokes access or hasn't authorized Gmail scope, API returns 403 with message to re-login.

**Gmail Service** (`lib/api/gmail.ts`):
- Singleton service accepting `refreshToken` parameter
- Uses same `GOOGLE_CLIENT_ID/SECRET` as NextAuth
- No environment variables for Gmail tokens needed
- Per-request OAuth2 client creation with user's token

### Authentication Middleware
`middleware.ts` currently allows all requests - actual protection happens at component level via session checks and API route validation.

### Polish Language
All UI text, email content, and AI prompts are in Polish. Keep this consistent when making changes.

## Common Development Patterns

### Adding a New Report Type
1. Create new tab component in `components/`
2. Add API route in `app/api/reports/`
3. Create email template function in `lib/templates/email.ts`
4. Add tab to `app/page.tsx`
5. Update types if needed

### Modifying Partner Data Fields
1. Update `Partner` interface in `types/index.ts`
2. Update `SHEET_COLUMN_MAPPING` in `lib/api/sheets.ts`
3. Update `mapRowToPartner()` method
4. Update email templates if displaying new fields

### Testing API Integrations
Each service has error handling that logs to console. Check:
- Browser console for client-side errors
- Terminal (where `npm run dev` runs) for server-side logs
- Service constructors throw if env vars missing

## Important Constraints

- **Domain Restriction**: Only `@vsprint` emails can authenticate
- **Sheet Format**: Must follow exact 44-column structure
- **ClickUp Mapping**: Partner names must match exactly between Sheets and mapping JSON
- **Email Sending**: Requires valid Gmail refresh token (expires periodically)
- **AI Content**: Gemini prompts are optimized for Polish language responses

## File Organization

```
app/
├── api/                    # API routes
│   ├── auth/              # NextAuth endpoints
│   ├── partners/          # Partner list endpoint
│   ├── reports/           # Report generation endpoints
│   └── opinion/           # Opinion submission handler
├── auth/                  # Auth UI pages
├── opinion/               # Opinion response pages
├── layout.tsx             # Root layout with SessionProvider
└── page.tsx               # Main dashboard with tabs

components/                # React components (tabs)
lib/
├── api/                   # Service layer (all integrations)
├── templates/             # HTML email templates
├── utils/                 # Helper functions (dates, typeform)
└── auth.ts                # NextAuth configuration

types/                     # TypeScript definitions
middleware.ts              # Request middleware (currently passthrough)
```

## Deployment Notes

When deploying to production:
1. Update `NEXTAUTH_URL` to production domain
2. Add production URL to Google OAuth redirect URIs
3. Generate new `NEXTAUTH_SECRET` with `openssl rand -base64 32`
4. Ensure all env vars are set in hosting platform
5. Gmail refresh token may need regeneration for production domain
