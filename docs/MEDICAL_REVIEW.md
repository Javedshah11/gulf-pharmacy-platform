# Independent medical and compliance review

| Role             | Academy authority                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUPER_ADMIN      | Manage categories, all scoped content, staff provisioning, reviewer assignments, separate compliance decisions, publish/archive, aggregate analytics |
| BRANCH_ADMIN     | View source-branch content, manage permitted metadata, submit and inspect feedback, scoped aggregate analytics                                       |
| PHARMACIST       | Create and upload own drafts within membership, revise content/captions, submit, inspect feedback                                                    |
| MEDICAL_REVIEWER | Read explicitly assigned source-branch records/media and append medical decisions on pending submissions                                             |

A Super Admin creates Academy staff through Staff & access, using the dedicated Academy staff API while preserving the existing Branch Admin API. Branch membership and account-disable controls apply to new roles and revoke existing sessions. Reviewer assignment is per video, requires active MEDICAL_REVIEWER role and source branch membership, and refuses the author. A review decision also independently rejects an author reviewing their own submission, even if their role changes later. Existing administrator accounts do not receive medical-review permission.

Medical reviewers must inspect the actual private processed clip and supporting references. The application does not verify medical truth, invent professional credentials, fetch external reference URLs, or replace professional judgment. It records who made each decision, the revision, comments and time. Author attribution is hidden until explicitly verified/authorized by compliance; an inactive author's name is hidden. A pharmacist role is internal access, not a generated public claim of licensure.

Compliance decisions are separate records made by an independent Super Admin. Decisions require comments. For general education, record a reasoned APPROVE or explicit NOT_REQUIRED. For regulated promotion, APPROVE requires an authorization reference and a future ISO timestamp; NOT_REQUIRED is rejected. Internal medical approval does not replace regulatory authorization. Required authorization is checked at publication and on every future public list/detail/asset request. Expired/absent authorization keeps content inaccessible, even when the stored workflow status remains PUBLISHED. No fake regulatory references should be entered in a live environment.

General education and regulated promotion have explicit separate classifications. Promotional items are excluded from the educational library and sitemap, carry a visible classification on their direct detail page, and are noindex. References, content classification, descriptions, titles and captions are all medically relevant revisions that invalidate both approvals. No AI or automation can independently grant either approval.

The public educational disclaimer explains that content does not replace individualized professional advice, diagnosis or prescriptions. It does not waive review, authorization or professional responsibilities. The application does not invent medicine stock, prices, treatment claims, clinician identities, or patient data.
