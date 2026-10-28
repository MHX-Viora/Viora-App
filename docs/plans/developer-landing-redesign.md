# ANKT Developer landing redesign

## Scope and design specification
User brief and supplied blue/white reference are the specification. Redesign only the `/developers` landing experience: sticky header, two-column hero, four-item benefit strip, ecosystem introduction/four cards, four-step timeline, documentation CTA, accessible FAQ and compact footer. Brand palette: #0866FF, #149DFF, #071B49, #F5FAFF, #E3ECF7, #64748B. Container max1280px, mobile breakpoint768px. Keep existing font stack with strong Vietnamese display typography. Use three optimized 3D illustrations, consistent lightweight SVG icons and scoped CSS; no heavy library.

## Audit and decisions
- Existing Expo web feature, HTML/CSS and same-origin BFF/session are reused. Existing landing is text/blueprint based, lacks reference illustrations, four-card grid and mobile hamburger; FAQ is stale after Stage4.
- Reuse Brand, Link, AccountMenu, DeveloperSession and HealthStatus. Landing-only shell variant protects Dashboard/docs/auth styles. No API, authentication, route, database or business-rule changes.
- Real routes: docs `/docs`, SDK roadmap `/docs#roadmap`, guide `/docs/getting-started`, community existing ANKT root `/`, policy `/policies`, contact `/contact`. SDK/SSO/Sandbox/review are future capabilities and must be labelled accordingly; Mini App configuration/domain verification exist. No unverified audience count is presented as a measured fact.

## Ordered implementation and acceptance
1. Landing shell/header: keep existing signed-in/out/account actions; add responsive navigation with Escape, focus and close-on-navigation. Verify login/register/console hrefs and scoped shell.
2. Landing content/assets: implement all reference sections and account-aware CTA using existing session; retain health request. Verify real destinations and honest FAQ/runtime status; typecheck after slice.
3. Responsive/motion/accessibility: 4/2/1 card grid, vertical mobile timeline, reserved/lazy image dimensions, visible focus, reduced motion and progressive reveal. Verify 320/375/768/1024/1440 widths, keyboard menu/FAQ and no overflow in real browser.
4. Validation/handoff: developer tests, TypeScript, focused ESLint, web export, browser runtime/network/links and signed-in/out behavior against isolated test host where available. Preserve unrelated dirty files; no auto commit or deployment. Record exact evidence and limitations in handoff.

## Risks
Shared shell changes are gated by a landing prop and landing CSS root. Existing docs contain stale stage text outside redesign scope; landing answers reflect implemented Stage4. Generated images are conceptual and labelled, never reported as live product functionality. Existing auth test fixtures are isolated from production data.
