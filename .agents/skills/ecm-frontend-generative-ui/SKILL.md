---
name: ecm-frontend-generative-ui
description: Frontend architecture, Next.js/React component design, responsive layouts, accessibility, state hydration, and safe Generative UI rendering for Egypt Career Map.
---

# ECM Frontend & Generative UI Architecture Standards

## 1. Domain Scope & Objectives
Governs the frontend architecture, component design, responsive styling (Tailwind CSS), state management, server/client hydration boundaries, and safe rendering of dynamic AI-generated UI widgets across Egypt Career Map.

### In-Scope
- React / Next.js component boundaries (Server Components vs Client Components).
- Generative UI: rendering dynamic, schema-validated UI cards, charts, and interactive walkthroughs from AI outputs.
- Defenses against UI injection (XSS, CSS injection, malicious script execution).
- Responsive design, RTL / LTR layout switching (Arabic / English), and WCAG 2.1 AA accessibility.
- Performance optimization: Core Web Vitals (LCP, FID, CLS), code-splitting, dynamic imports.
- Global state management, optimistic UI updates, and error boundaries.

### Non-Goals
- Backend API routing (see `ecm-api-backend-architecture`).
- BI statistical aggregation (see `ecm-bi-market-intelligence`).

---

## 2. Technical Contracts & Standards

### Safe Generative UI Rendering Contract
When rendering UI widgets generated or suggested by AI agents:
1. **Never Render Raw HTML Strings:**
   - Raw `dangerouslySetInnerHTML` is strictly prohibited for AI-generated text or markdown without sanitization (DOMPurify).
2. **Schema-Validated Component Dispatch:**
   - The AI must emit a structured JSON payload conforming to an explicit Component Catalog schema:
     ```json
     {
       "component": "SkillComparisonCard",
       "props": {
         "skillName": "Docker",
         "demandPercentage": 42.5,
         "salaryImpactEgp": 8500,
         "relatedSkills": ["Kubernetes", "Linux", "CI/CD"]
       }
     }
     ```
   - The frontend validates the schema and renders pre-compiled React components from the catalog.
3. **ErrorBoundary Wrapping:**
   - Every Generative UI widget container must be wrapped in a React Error Boundary with a graceful fallback UI.

### RTL / LTR Multilingual Contract
- Use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) rather than physical directions (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`).
- Set `dir="rtl"` on `<html>` or container when rendering Arabic text; adjust typography line-heights for Arabic font legibility (e.g., Cairo, Tajawal).

---

## 3. Step-by-Step UI Component Engineering Workflow

1. **Component Interface Definition:**
   - Define TypeScript props interface with strict optionality and types.
2. **Server vs Client Boundary Selection:**
   - Keep components as React Server Components (RSC) by default.
   - Add `'use client'` only when state hooks (`useState`, `useEffect`), browser events, or animations are required.
3. **Responsive & Accessible Markup:**
   - Implement semantic HTML (`<main>`, `<section>`, `<article>`, `<button>`).
   - Add `aria-label`, `aria-expanded`, and keyboard focus rings.
   - Verify layout on mobile (375px), tablet (768px), and desktop (1280px).
4. **Data Fetching & Hydration:**
   - Fetch data via server actions or TanStack Query with suspense/loading skeletons.
   - Handle empty states, loading states, and error states explicitly.
5. **Generative Widget Integration:**
   - Register new component in `GenerativeWidgetCatalog`.
   - Add Zod schema validator for component props.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Stored XSS via AI Text** | Model outputs `<script>` or `onload=` in markdown; rendered directly to DOM. | Sanitize all rich text via DOMPurify; prefer structured component rendering over raw HTML. |
| **Hydration Mismatch Errors** | Client-side time or browser-only APIs (`window`, `localStorage`) rendered during SSR. | Defer browser-only rendering to `useEffect` or dynamic import with `{ ssr: false }`. |
| **Broken RTL Layout** | Using hardcoded `left-0` or `pl-4` flips incorrectly when Arabic language is selected. | Replace physical classes with logical properties (`start-0`, `ps-4`). |
| **UI Freeze on Heavy Charts** | Rendering thousands of SVG nodes for skill maps on low-end devices. | Virtualize lists; use Canvas / WebGL for large 3D graphs; paginate analytical views. |

---

## 5. Verification Checklist

- [ ] All AI-generated widgets use structured JSON component dispatch with schema validation.
- [ ] No unsanitized `dangerouslySetInnerHTML` in codebase.
- [ ] Responsive design verified across mobile, tablet, and desktop breakpoints.
- [ ] Arabic views use logical Tailwind classes and correct RTL reading order.
- [ ] Component wrapped in Error Boundary with graceful fallback.

---

## 6. Primary References
- **Next.js App Router Documentation**: https://nextjs.org/docs/app
- **W3C Web Content Accessibility Guidelines (WCAG) 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Tailwind CSS Logical Properties Guide**: https://tailwindcss.com/docs
