# AegisNet Bug Report

Use this template to file a clear, actionable bug report during the QA Bash.

### [ ] Bug title
*A clear, concise summary of the issue.*

### [ ] Date
*Date the bug was discovered.*

### [ ] Tester
*Your name or identifier.*

### [ ] Browser
*e.g., Chrome 120, Firefox 121, Safari 17.*

### [ ] Screen size or device
*e.g., Desktop 1080p, Mobile 375px width, iPhone 14.*

### [ ] Frontend URL
*The exact route where the issue occurred (e.g., `http://localhost:5173/app/network/net_1`).*

### [ ] Backend health status
*Was the backend connected? (Check `/app/qa` or `/health`).*

---

### [ ] Steps to reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### [ ] Expected result
*What should have happened?*

### [ ] Actual result
*What actually happened?*

---

### [ ] Screenshots or video
*Attach or link screenshots/videos showing the issue.*

### [ ] Console errors
*Paste any relevant frontend browser console errors here. (Ensure no private data is included).*

### [ ] Backend errors
*Paste any relevant backend terminal/log errors here. Include the `X-Request-ID` if applicable.*

### [ ] Network request errors
*Paste failed XHR/Fetch request details (Status code, Endpoint, Request ID).*

---

### [ ] Local-only or backend-backed area
*Is this issue in a local mock (e.g., File Vault) or a backend-backed feature (e.g., Network load)?*

### [ ] Security/privacy impact
*Does this bypass a prototype security control or expose metadata?*

### [ ] Severity: Critical, High, Medium, Low, Cosmetic
*Choose one:*
- **Critical:** App crash, data loss, security failure.
- **High:** Core feature broken, no workaround.
- **Medium:** Core feature broken, workaround available.
- **Low:** Minor feature broken, nuisance.
- **Cosmetic:** Visual glitch, typo, contrast issue.

### [ ] Is data loss involved?
*Yes/No (Explain briefly if Yes).*

### [ ] Is private data exposed?
*Yes/No (Explain briefly if Yes).*

### [ ] Does it block normal use?
*Yes/No.*

### [ ] Workaround if known
*How can a user avoid this bug right now?*
