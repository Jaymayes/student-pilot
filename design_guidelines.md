# ScholarLink Design Guidelines

## Design Approach

**Selected Framework**: Design System Approach (Material Design 3 principles)
**Rationale**: ScholarLink is a utility-focused platform requiring information density, data visualization, and complex workflows. Material Design 3 provides the necessary components for dashboards, forms, and data displays while maintaining modern aesthetics appealing to Gen Z students.

**Key Design Principles**:
- Clean, professional interface that builds trust with institutions
- Scannable layouts optimized for scholarship discovery
- Progressive disclosure to manage complexity
- Mobile-first responsive design for on-the-go access

## Typography

**Font Families** (Google Fonts):
- Primary: 'Inter' - for UI elements, body text, data displays
- Accent: 'Playfair Display' - for hero headlines and section headers only

**Type Scale**:
- Hero Display: 3.5rem (56px) / Bold / Playfair Display
- H1 Section Headers: 2.5rem (40px) / SemiBold / Inter
- H2 Card Titles: 1.5rem (24px) / SemiBold / Inter
- H3 Subsections: 1.25rem (20px) / Medium / Inter
- Body Large: 1.125rem (18px) / Regular / Inter
- Body Standard: 1rem (16px) / Regular / Inter
- Body Small: 0.875rem (14px) / Regular / Inter
- Labels/Captions: 0.75rem (12px) / Medium / Inter

## Layout System

**Spacing Primitives** (Tailwind units):
Primary spacing scale: **2, 4, 6, 8, 12, 16, 20, 24**
- Micro spacing (between related elements): 2, 4
- Component internal padding: 6, 8
- Component external margins: 12, 16
- Section padding: 20, 24
- Major layout gaps: 16, 20

**Grid System**:
- Dashboard: 12-column responsive grid
- Scholarship cards: 3-column desktop (lg:grid-cols-3), 2-column tablet (md:grid-cols-2), 1-column mobile
- Document grid: 4-column desktop for file thumbnails
- Max container width: max-w-7xl for main content areas

## Component Library

### Navigation
**Primary Header** (Sticky, backdrop blur):
- Logo left, main nav center, user profile + credits indicator right
- Nav items: Dashboard, Discover, My Applications, Documents, Profile
- Credit display with gold accent badge
- Height: h-16 with py-4 padding
- Mobile: Hamburger menu with slide-out drawer

**Dashboard Sidebar** (Desktop only, hidden mobile):
- Width: w-64, fixed positioning
- Quick filters, saved searches, application status overview
- Collapsible sections with expand/collapse indicators

### Hero Section (Marketing Landing)
**Full-width hero with large background image**:
- Image: Diverse college students collaborating in modern campus setting, bright and aspirational
- Height: min-h-screen on desktop, min-h-[600px] on mobile
- Content overlay with gradient backdrop
- Centered content: Playfair Display headline, supporting text, dual CTA buttons (primary + ghost outline)
- Buttons have backdrop-blur-md bg-white/20 treatment
- Scroll indicator arrow at bottom

### Core Components

**Scholarship Cards**:
- Elevated surface with shadow-md, rounded-xl borders
- Header: Institution logo (left) + match score badge (right, gold background)
- Content: Title (H2), deadline date with icon, award amount (prominent, gold text), brief description
- Tags section: Award type, eligibility criteria as rounded chips
- Footer: Two-button layout (Quick View + Apply)
- Hover state: shadow-lg elevation increase

**Match Score Indicator**:
- Circular progress ring visualization (using conic gradient)
- Percentage display in center
- Color gradations: 0-50% (neutral), 51-75% (blue accent), 76-100% (gold)
- Size variations: lg (80px) for detail views, md (48px) for cards, sm (32px) for lists

**Document Upload Zone**:
- Dashed border container (border-2 border-dashed)
- Drag-and-drop active state with background color change
- File type icons grid showing accepted formats
- Upload progress bars with percentage indicators
- Document list view: file icon, name, size, upload date, action menu (three-dot)

**Profile Sections**:
- Tab navigation for: Personal Info, Academic Details, Financial Info, Documents
- Form layouts: 2-column on desktop, stacked on mobile
- Input fields with floating labels
- Profile completion progress bar at top (segmented, gold accent for completed)

**Essay Assistant Panel**:
- Split view: Prompt display (left) + Writing area (right)
- Word count tracker, AI suggestions sidebar (collapsible)
- Character limit indicators
- Save draft button (auto-save indicator)
- Version history dropdown

**Payment/Credits Modal**:
- Centered overlay with max-w-2xl
- Pricing tiers in 3-column card grid
- Current credit balance prominently displayed
- Transaction history expandable section
- Secure payment badge with icons

### Data Displays

**Application Tracker**:
- Stepper component showing: Not Started → In Progress → Submitted → Under Review → Result
- Timeline view with date stamps
- Status indicators with color coding
- Document checklist within each step

**Scholarship Filters**:
- Accordion-style filter groups (Award Amount, Deadline, Field of Study, Eligibility)
- Range sliders for amount filtering
- Multi-select checkboxes with search
- Active filters display as removable chips
- Filter count badges

**Dashboard Stats Cards**:
- 4-card grid: Total Scholarships Found, Applications In Progress, Submitted, Total Potential Award
- Large number display with supporting label below
- Subtle icon accent (gold) top-right
- Minimal padding for clean look

## Interaction Patterns

**Loading States**: Skeleton loaders matching card/list structures, shimmer animation
**Empty States**: Centered illustration + headline + supportive text + CTA button
**Notifications**: Toast messages top-right, auto-dismiss after 4s
**Modals**: Max-width containers with backdrop blur, slide-up animation on mobile
**Form Validation**: Inline error messages below fields, success checkmark icons

## Dark Mode Implementation

**Color Mapping**:
- Background: Deep navy (#0A1929) instead of pure black
- Surface elevated: Lighter navy (#13293D - brand color)
- Text primary: White (#FFFFFF)
- Text secondary: Gray-300 (#D1D5DB)
- Accent gold: Keep #F5A742, but reduce opacity to 90% for better contrast
- Interactive states: Navy-600 hover backgrounds

**Toggle**: Header-mounted sun/moon icon button

## Images

**Hero Section**: Full-bleed background image of diverse students in modern campus library/study space. Bright, aspirational, professional photography. Size: 1920x1080 minimum.

**Empty States**: Custom illustrations (simple, 2-color: navy + gold) for "No scholarships yet," "No documents uploaded," etc.

**Institution Logos**: Display within scholarship cards, standardized to 60x60px containers, maintain aspect ratio.