# Managing public branch profiles

Phase 3 extends the existing branches table, controllers, service authorization, and administrator editor. It keeps one frontend, one API, and one PostgreSQL database. There is no new session architecture or public registration.

## Publication and permissions

| Action                                              | SUPER_ADMIN                  | BRANCH_ADMIN           |
| --------------------------------------------------- | ---------------------------- | ---------------------- |
| View private branch profiles                        | All                          | Assigned branches only |
| Edit existing name/address/phone/contact links      | All                          | Assigned branches only |
| Edit bilingual description/contact name/postal code | All                          | Assigned branches only |
| Publish or unpublish a branch                       | Yes                          | No                     |
| Approve opening hours and services                  | Yes                          | No                     |
| View published public branch profiles               | Public access                | Public access          |
| Manage staff and memberships                        | Existing Phase 2 permissions | No                     |

The backend checks the current session, account, role, and membership inside transactions. Changing a URL or sending publication/hours/service fields directly does not bypass these checks. Branch Admin requests for another branch are denied; publishing and approving structured services/hours require Super Admin even for an assigned branch.

Sign in at `/admin/login`, open **Branches**, and select the branch. Existing forms retain their confirmation dialog and success/error states. The added Public branch profile section edits optional English/Arabic descriptions and public contact names, plus a postal code. Blank optional text clears a field. Unknown information should remain empty, and no email field is provided.

Super Admins also see a publication checkbox, a day/time editor, and a bilingual service editor. Confirm the real business details before saving. Both language names are required for each approved service; at most 12 services and one opening period per selected weekday are accepted. Days use 0=Sunday through 6=Saturday, with HH:mm local Saudi time. A closing time earlier than opening means the next day. Identical opening/closing times and duplicate weekdays are rejected. Unselected days are unknown/omitted, not asserted to be closed. Special-date schedules, split daily periods, and a separate 24-hour declaration are not represented by this initial hours editor; do not invent substitute times.

Branch Admin profile edits to a published branch appear immediately on public pages. Only Super Admin controls publication and the centrally approved hours/service fields. Unpublishing removes the branch from public list/search, branch pages, contact lists, homepage discovery, and sitemap. A known unpublished slug returns 404 publicly, while authorized staff can still edit its private profile. Inactive branches remain hidden even if their publication flag is true.

## Additive migration

`0002_public_branch_profiles.sql` adds is_published (default false), description_en/ar, contact_name_en/ar, postal_code, opening_hours, services, and public_updated_at. It adds a publication index and JSON-array constraints. Existing migrations 0000 and 0001 are unchanged.

The migration publishes only the already-confirmed `gulf-pharmacy-dammam` record, fills its newly added contact name fields from the supplied Dr. Fahad Badshah details, and records postal code 32241. It does not overwrite the existing branch's name, address, phone, links, activation state, staff, memberships, or sessions. Other existing/new records remain drafts until explicitly published. The seed inserts the confirmed Dammam profile only if missing and never resets later administrator edits or publication choices.

Descriptions, services, and hours start empty. No additional live branches were created. The database and directory accept more than ten branch records; a disposable-database test verifies 12 published fixtures. Creation/import of additional real branch records requires verified business data; a branch-creation interface is outside this phase's requested profile/publication editor.

All profile/publication edits update public_updated_at and write actor, branch ID, and changed field names to the existing transactional audit log. The public API projects business fields only, never staff records, memberships, session data, or audit metadata.

## Public API and caching

GET `/api/branches` returns active, published business profiles; `?q=` searches English/Arabic names and addresses, city, and district. Queries are trimmed, limited to 100 characters, parameterized, and treat LIKE wildcard characters literally. GET `/api/branches/:slug` returns one published active profile or 404. API responses and frontend branch fetches are no-store.

The existing PATCH `/api/admin/branches/:id` validates the added fields with nested DTOs and continues to deny unknown/privileged fields. Public business updates do not revoke staff sessions because no access permissions changed. Phase 2 account and membership changes continue to revoke sessions as before.

Reusable contact actions use `data-contact-kind` and `data-branch-slug` as a future integration point. No analytics listener, tracker, customer-number collection, or automatic message sending is installed. WhatsApp/telephone/maps links use the stored confirmed values; customers choose whether to open an external service.
