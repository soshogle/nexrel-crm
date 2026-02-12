# Nexrel EHR Bridge – Design & Schema

## Popup UI Mockup

![Nexrel EHR Bridge Popup](./nexrel-ehr-bridge-popup-mockup.png)

**Dimensions:** 380×480–560px | **Brand:** Purple gradient (#7c3aed), white text, clean cards

---

## Architecture Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NEXREL EHR BRIDGE (Chrome Extension)                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │      POPUP UI       │  │   CONTENT SCRIPTS    │  │  BACKGROUND WORKER   │   │
│  │  popup.html/css/js  │  │  ehr-detector.js     │  │  service-worker.js   │   │
│  ├─────────────────────┤  │  content.js          │  ├─────────────────────┤   │
│  │ • Auth (token)      │  ├─────────────────────┤  │ • API fetch (notes)  │   │
│  │ • Notes list        │  │ • Detect EHR from   │  │ • Token storage      │   │
│  │ • Push Latest       │  │   URL (dentrix.com, │  │ • Message routing    │   │
│  │ • Per-note Push     │  │   dentitek.ca, etc) │  └──────────┬──────────┘   │
│  │ • Quick Actions     │  │ • Inject SOAP into  │              │             │
│  │ • Connect/Logout    │  │   DOM fields        │              │             │
│  └──────────┬──────────┘  │ • Field mappings    │              │             │
│             │              └──────────┬──────────┘              │             │
│             │                         │                           │             │
│             │    chrome.tabs.         │      chrome.storage        │             │
│             │    sendMessage         │      .local                │             │
│             └────────────────────────┼───────────────────────────┘             │
│                                      │                                          │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     NEXREL API      │    │    EHR TAB (DOM)    │    │  EHR API (future)    │
│  nexrel.soshogle.com│    │  Dentrix, Athena,   │    │  Read/Write when     │
├─────────────────────┤    │  Dentitek, etc.     │    │  configured          │
│ POST /auth/generate │    ├─────────────────────┤    └─────────────────────┘
│ GET  /notes         │    │ User opens patient  │
│ GET  /export/[id]   │    │ chart → extension   │
│ GET  /mappings      │    │ injects SOAP note   │
└─────────────────────┘    │ into textareas      │
                           └─────────────────────┘
```

---

## Data Flow: Push to EHR

```
┌──────────┐    1. User clicks     ┌──────────┐    2. fetch /api/ehr-bridge/export/[id]
│  POPUP   │ ───────────────────► │  POPUP   │ ─────────────────────────────────────►
│  (User)  │    "Push" button     │  (JS)    │     Authorization: Bearer <token>       │
└──────────┘                     └────┬─────┘                                        │
                                      │                                              │
                                      │    3. Formatted note + SOAP fields            │
                                      │ ◄─────────────────────────────────────────────
                                      │
                                      │    4. chrome.tabs.sendMessage(tabId, {action: 'inject', payload})
                                      ▼
┌──────────────────┐    5. Content script receives    ┌──────────────────┐
│  CONTENT SCRIPT │ ◄───────────────────────────────│  EHR TAB         │
│  (content.js)   │                                 │  (Dentrix, etc.) │
├──────────────────┤    6. Find fields by selector   └────────┬─────────┘
│ • getEhrStatus() │     (from mappings: #Subjective,         │
│ • injectNote()   │      .clinical-note, etc.)                 │
│ • setFieldValue()│    7. Fill textarea / contentEditable      │
└────────┬─────────┘    8. dispatchEvent('input')              │
         │                                                      │
         └──────────────────────────────────────────────────────┘
                          Note appears in EHR
```

---

## Component Map

| Component | File | Purpose |
|-----------|------|---------|
| Popup | `popup/popup.html` | UI shell |
| Popup styles | `popup/popup.css` | Nexrel purple gradient, cards, buttons |
| Popup logic | `popup/popup.js` | Auth, fetch notes, push handlers |
| EHR detector | `content/ehr-detector.js` | Detect EHR type from `window.location` |
| Content script | `content/content.js` | Receive inject msg, DOM injection, field mapping |
| Background | `background/service-worker.js` | API client, message routing |
| Mappings | `lib/ehr-bridge/mappings.ts` | EHR type → CSS selectors (API + extension fallback) |

---

## Supported EHRs (URL → Display Name)

| Pattern | Display Name |
|---------|--------------|
| dentrix.com, ascend.dentrix.com | Dentrix, Dentrix Ascend |
| eaglesoft.net | Eaglesoft |
| opendental.com | Open Dental |
| dentitek.ca, dentitek.info, dentitek.net | Dentitek |
| novologik.com | OrthoNovo |
| progident.com | Progident |
| athenahealth.com | Athenahealth |
| epic.com | Epic |
| simplepractice.com | SimplePractice |
| tebra.com | Tebra |
| * | Generic |

---

## Brand Colors

| Token | Value |
|-------|-------|
| Primary | `hsl(262, 83%, 58%)` (#7c3aed) |
| Header gradient | `135deg, primary → hsl(270, 75%, 55%)` |
| Success (EHR ready) | `#10b981` |
| Card background | `#fafafa` |
| Border | `#e5e7eb` |
