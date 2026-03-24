# OnoLeads - Homepage + Landing Pages Design
## Date: 2026-03-24

## Context
Build homepage with smart program finder and auto-generate landing pages for all ~62 academic degree programs (BA/BSc/MBA/MA/LLB/LLM). No certificate or continuing education programs.

## Homepage (`/`) - Smart Program Finder

### Section 1: Hero + Interactive Quiz
- Full-viewport hero, Ono branding, "הקריה האקדמית אונו - המכללה המומלצת בישראל"
- 2-step interactive quiz:
  - Step 1: "מה מעניין אותך?" - 6 category cards (עסקים, משפטים, חינוך, בריאות, טכנולוגיה, אמנויות)
  - Step 2: "איזו רמה?" - 2 buttons (תואר ראשון, תואר שני)
- Results: matching program cards with CTA to each landing page
- Mini lead form in results

### Section 2: Featured Programs (6 cards)
- Computer Science, Law, MBA Finance, Nursing, Education, Cyber
- Card: name, degree, short desc, CTA → landing page

### Section 3: Social Proof
- Animated counters: students, years, faculties, employment rate

### Section 4: Global Lead Form
- "השאירו פרטים ויועץ יחזור אליכם"
- Name, phone, email, program dropdown

### Section 5: Footer
- Ono branding, contact, links

## Landing Pages (`/lp/[slug]`) - ~62 pages
Auto-created from degree_program template with sections:
- Hero (program name, degree, faculty, stat)
- Form (3-field lead capture)
- Stats (duration, campuses, format)
- FAQ (4-5 per program type)
- CTA + WhatsApp

## Navigation
- Sticky minimal header: logo + "חזרה לכל התוכניות" + phone CTA
- Self-contained pages for max conversion

## URL Structure
- `/` → Homepage
- `/lp/[slug]` → Landing pages (~62)
- `/dashboard` → Admin

## Scope
- Only academic degrees (bachelor + master)
- ~62 programs across 5 faculties + international school
- Hebrew primary, structure supports EN/AR later
