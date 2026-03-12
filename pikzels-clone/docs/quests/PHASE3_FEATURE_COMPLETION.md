# Phase 3: Feature Completion

**Priority:** P2 -- Important features, not launch blockers
**Scope:** 4 tasks (new pages + integrations)
**Depends on:** Phase 1 completed, Phase 2 recommended
**Reference:** `PRODUCTION_READINESS_AUDIT_2026_03.md`

---

## Task 15: Build Teams Page Frontend

**Problem:** The backend collaboration module exists with full team CRUD, member management, and invitation endpoints, but there is no frontend Teams page.

**Backend endpoints available (already implemented):**

- `POST /api/teams` -- Create team
- `GET /api/teams` -- List user's teams
- `GET /api/teams/:id` -- Team details with members
- `PUT /api/teams/:id` -- Update team
- `DELETE /api/teams/:id` -- Delete team (owner only)
- `POST /api/teams/:teamId/invite` -- Send invitation
- `DELETE /api/teams/:teamId/members/:memberId` -- Remove member
- `PUT /api/teams/:teamId/members/:memberId/role` -- Update role
- `GET /api/invitations` -- Pending invitations
- `POST /api/invitations/:id/respond` -- Accept/decline
- `GET /api/teams/:teamId/projects` -- Team projects

**Implementation:**

- Create `client/src/components/dashboard/TeamsPage.tsx`
- Add route in the dashboard router
- Add navigation link in the sidebar

**Page sections:**

1. **My Teams** -- Grid/list of teams the user belongs to, with role badge
2. **Create Team** -- Modal with name + description fields
3. **Team Detail View** -- Members list, pending invitations, team projects
4. **Invite Member** -- Modal with email input + role selector (admin/editor/viewer)
5. **Pending Invitations** -- List of invitations received, with Accept/Decline buttons

**Patterns to follow:**

- Use `authGet`/`authPost` from `utils/api.ts` (same as other pages)
- Create a `useTeams` custom hook for state management
- Implement loading/error/empty states (same pattern as ProjectsPage)
- Follow dark theme styling consistent with existing dashboard pages

**Depends on:** Task 10 (team invitations must use real data, not mocks)

**Verify:**

- Create a team via the UI
- Invite a member (test with a second account)
- Accept/decline invitation
- View team projects
- Update member role
- Delete team (owner only)

---

## Task 16: Build Template Marketplace Page

**Problem:** The existing TemplatesPage shows the user's own templates. There's no public marketplace for browsing, purchasing, or rating templates from other creators.

**Backend extensions needed:**

- `GET /api/marketplace/templates` -- Public templates with pagination, category, sort
- `GET /api/marketplace/templates/:id` -- Template detail with preview
- `POST /api/marketplace/templates/:id/purchase` -- Purchase premium template (credit deduction)
- `POST /api/marketplace/templates/:id/review` -- Add rating/review
- `GET /api/marketplace/creators/:id` -- Creator profile with their public templates

**Implementation:**

**Backend:**

- Create `src/modules/marketplace/` module (routes, controller, service)
- Extend the `Template` model if needed (add `price`, `isPublic`, `rating` fields -- check if they already exist in schema)
- Purchase flow: deduct credits from buyer, clone template to buyer's account
- Review system: simple star rating + text review

**Frontend:**

- Create `client/src/components/dashboard/MarketplacePage.tsx`
- Add route and sidebar navigation

**Page sections:**

1. **Featured/Trending** -- Carousel of popular templates
2. **Browse by Category** -- Grid with category tabs (YouTube, Instagram, TikTok, Gaming, etc.)
3. **Template Detail** -- Preview, description, creator info, reviews, "Use Template" / "Purchase" button
4. **Creator Profile** -- Public profile showing their templates and stats

**Verify:**

- Browse marketplace without purchasing
- Purchase a template with credits
- Confirm template appears in user's TemplatesPage after purchase
- Add a review
- View creator profile

---

## Task 17: Configure YouTube Trending Integration

**Problem:** TrendingPage attempts to call the YouTube Data API v3 but falls back to hardcoded example thumbnails when `YOUTUBE_API_KEY` is not set. For a real trending experience, this needs a valid API key.

**Backend module:** `src/modules/youtube-trending/youtube-trending.service.ts` (already implemented)

**Steps:**

1. Obtain a YouTube Data API v3 key from Google Cloud Console
2. Add `YOUTUBE_API_KEY` to Railway environment variables
3. Add `YOUTUBE_API_KEY` to `.env.example` with a placeholder comment
4. Test the TrendingPage with real YouTube data

**API quota considerations:**

- YouTube Data API has a free quota of 10,000 units/day
- Each trending videos request costs ~3 units
- With caching (already implemented), this should be sufficient

**Alternative if YouTube API is not desired:**

- Build a curation system where admins manually add trending thumbnails
- Scrape public thumbnail galleries (respect ToS)
- Use the existing fallback curated examples but present them honestly (not as "trending")

**Verify:**

- TrendingPage shows real YouTube trending videos
- Category and region filters return different results
- Thumbnails display with real view counts and publish dates

---

## Task 18: Resolve DashboardHome OAuth Integrations

**Problem:** Google Drive and Apple iCloud buttons fake a "connected" state via setTimeout. Task 4 (Phase 1) addresses the immediate cosmetic issue. This task is about building real integrations if desired.

**Option A: Build Real Google Drive Integration**

- Register app in Google Cloud Console
- Implement OAuth 2.0 flow (Google already configured in backend OAuth module)
- Use Google Drive API to list user's image files
- Allow selecting images as thumbnail source material
- Store OAuth tokens securely (encrypted in database)

**Option B: Build Real iCloud Integration**

- Apple's CloudKit JS / Sign in with Apple
- More complex than Google, limited API for file browsing
- Consider whether this is worth the effort for MVP

**Option C: Remove Both (Recommended for MVP)**

- Already handled by Task 4 in Phase 1
- Re-add as a future feature when there's demand

**Verify (if building real integration):**

- OAuth flow completes without errors
- User can browse their cloud files
- Selected files are usable in the thumbnail generation flow
- Disconnecting revokes access properly

---

## Completion Checklist

- [ ] Task 15: Teams page built, CRUD + invitations working
- [ ] Task 16: Marketplace page built with purchase flow
- [ ] Task 17: YouTube API configured OR alternative approach chosen
- [ ] Task 18: OAuth integrations resolved (built or removed)
- [ ] New pages follow existing dashboard styling and patterns
- [ ] All changes pass `npm run lint` and `npx tsc --noEmit`
- [ ] New API endpoints have authentication middleware
