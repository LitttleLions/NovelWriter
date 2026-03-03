# PromptMate Design System Specification - Implementation Reference

## Typography
- **Primary Font**: `Plus Jakarta Sans` (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800
- **Scale**:
  - Display: 36-48px (800)
  - H1: 30-36px (700)
  - H2: 24px (700)
  - H3: 20px (600)
  - Body: 14-16px (400)
  - Small: 12-13px (500)

## Colors (HSL)
### Light Mode
- Background: `230 25% 97%` (#F4F5F7)
- Foreground: `230 25% 15%` (#1D2033)
- Card: `0 0% 100%` (#FFFFFF)
- Primary: `28 95% 55%` (#F59E0B)
- Secondary: `28 30% 95%` (#FAF3EB)
- Muted: `230 20% 93%` (#ECEDF1)
- Destructive: `0 84% 60%` (#EF4444)
- Border/Input: `230 20% 90%` (#E2E4EA)

### Dark Mode
- Background: `230 25% 8%` (#0F1119)
- Foreground: `230 20% 95%` (#F0F1F4)
- Card: `230 25% 12%` (#171B28)
- Primary: `28 95% 58%` (#F6A723)
- Secondary: `230 25% 18%` (#242838)
- Muted: `230 25% 18%` (#242838)
- Destructive: `0 63% 45%` (#BA2D2D)
- Border/Input: `230 25% 20%` (#2A2F40)

## Layout & Components
- **Border Radius**: 
  - Cards: 16px (`rounded-2xl`)
  - Buttons: 12px (`rounded-xl`)
  - Inputs: 8px (`rounded-md`)
  - Badges: 9999px (`rounded-full`)
- **Shadows**:
  - Card: `0 2px 12px -2px hsl(230 25% 15% / 0.06)`
  - Hover: `0 8px 24px -4px hsl(28 95% 55% / 0.2)`
- **Transitions**: 150ms-300ms ease-out
