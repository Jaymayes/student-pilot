# Accessibility & Mobile Testing Guide

## Overview

This guide provides comprehensive testing procedures for WCAG 2.1 AA compliance and mobile responsiveness across the top device/browser matrix for ScholarLink.

## WCAG 2.1 AA Testing Checklist

### 1. Keyboard Navigation (WCAG 2.1.1, 2.1.2)

#### Manual Testing Steps:
- [ ] Tab through all interactive elements in logical order
- [ ] Verify all interactive elements are reachable via keyboard
- [ ] Test Escape key closes modals and dropdowns
- [ ] Use arrow keys for navigation in lists/menus
- [ ] Test Enter and Space key activation for buttons
- [ ] Verify no keyboard traps exist

#### Key User Flows to Test:
1. **Application Flow**: Dashboard → Search → Application Form → Submit
2. **Profile Management**: Login → Profile → Edit → Save
3. **Document Upload**: Documents → Upload → Manage → Delete
4. **Credit Purchase**: Billing → Purchase → Confirm → Receipt

### 2. Screen Reader Compatibility (WCAG 1.1.1, 1.3.1, 4.1.2)

#### Testing with NVDA/JAWS/VoiceOver:
- [ ] All images have appropriate alt text
- [ ] Form labels are properly associated
- [ ] Headings follow logical hierarchy (h1→h2→h3)
- [ ] Links have descriptive text
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced

#### ARIA Implementation:
- [ ] Interactive elements have proper ARIA labels
- [ ] Form validation uses `aria-describedby`
- [ ] Modal dialogs use `aria-modal` and focus trapping
- [ ] Expandable content uses `aria-expanded`
- [ ] Live regions for dynamic updates

### 3. Color Contrast (WCAG 1.4.3, 1.4.6)

#### Automated Testing Tools:
- Use WebAIM Contrast Checker
- Chrome DevTools Lighthouse accessibility audit
- axe DevTools extension

#### Manual Verification:
- [ ] Text contrast ratio ≥ 4.5:1 (AA normal text)
- [ ] Large text contrast ratio ≥ 3:1 (AA large text)
- [ ] Non-text elements contrast ratio ≥ 3:1
- [ ] Focus indicators are visible with sufficient contrast

### 4. Touch Target Sizes (WCAG 2.5.5)

#### Testing Requirements:
- [ ] Minimum touch target size: 44px × 44px
- [ ] Adequate spacing between touch targets
- [ ] Touch targets work with various input methods
- [ ] Hover states don't interfere with touch interaction

## Mobile Responsiveness Testing

### Device Priority Matrix

#### Tier 1 - Essential (Must Test)
| Device | Screen Size | Browser | Usage Priority |
|--------|-------------|---------|----------------|
| iPhone 12/13/14 | 390×844 | Safari Mobile | Critical |
| Samsung Galaxy S21 | 360×800 | Chrome Mobile | Critical |
| iPad | 768×1024 | Safari | High |
| Desktop 1920×1080 | 1920×1080 | Chrome | High |

#### Tier 2 - Important
| Device | Screen Size | Browser | Usage Priority |
|--------|-------------|---------|----------------|
| iPhone SE | 375×667 | Safari Mobile | Medium |
| iPhone 14 Plus | 428×926 | Safari Mobile | Medium |
| Google Pixel 5 | 393×851 | Chrome Mobile | Medium |
| Samsung Galaxy | 360×800 | Samsung Internet | Medium |
| iPad Pro 11" | 834×1194 | Safari | Medium |
| Desktop 1366×768 | 1366×768 | Edge | Medium |

#### Tier 3 - Nice to Have
| Device | Screen Size | Browser | Usage Priority |
|--------|-------------|---------|----------------|
| Surface Pro | 912×1368 | Edge | Low |
| iPad Pro 12.9" | 1024×1366 | Safari | Low |
| Desktop 2560×1440 | 2560×1440 | Firefox | Low |

### Responsive Breakpoints

```css
/* Mobile First Approach */
/* xs: 320px - Small phones */
/* sm: 480px - Large phones */ 
/* md: 768px - Tablets */
/* lg: 1024px - Small desktops */
/* xl: 1280px - Large desktops */
/* xxl: 1536px - Extra large screens */
```

### Key Mobile Testing Areas

#### Navigation & Interaction
- [ ] Touch-friendly navigation (hamburger menu, bottom nav)
- [ ] Proper focus management on mobile keyboards
- [ ] Swipe gestures work correctly
- [ ] Orientation changes handled gracefully
- [ ] Safe area support (iPhone notch, etc.)

#### Performance
- [ ] Fast loading on 3G/4G connections
- [ ] Optimized images for different pixel densities
- [ ] Touch response time < 100ms
- [ ] Smooth scrolling and animations

#### Content Layout
- [ ] Text remains readable without horizontal scrolling
- [ ] Images scale appropriately
- [ ] Forms are easy to fill on mobile
- [ ] Tables are responsive or horizontally scrollable

## Cross-Browser Testing Tools

### Recommended Testing Platforms

#### BrowserStack (Recommended)
- **Setup**: Create account at browserstack.com
- **Features**: 
  - Real device testing
  - Automated screenshot testing
  - Local testing tunnel
  - Mobile device lab
- **ScholarLink Usage**: Test all Tier 1 combinations

#### LambdaTest (Alternative)
- **Setup**: Create account at lambdatest.com
- **Features**:
  - Live interactive testing
  - Screenshot testing
  - Automated testing integration
  - Mobile browser testing
- **ScholarLink Usage**: Complement BrowserStack testing

### Local Testing Setup

#### Chrome DevTools Device Simulation
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Test responsive design with various device presets
4. Check accessibility panel for issues

#### Firefox Responsive Design Mode
1. Open DevTools (F12)
2. Click responsive design mode icon
3. Test different viewport sizes
4. Use accessibility inspector

### Automated Testing Integration

#### Lighthouse CI
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run accessibility audit
lhci autorun --collect.settings.chromeFlags="--no-sandbox" --collect.numberOfRuns=1
```

#### axe-core Integration
```javascript
// Add to test suite
import axe from 'axe-core';

// Run accessibility tests
const results = await axe.run();
expect(results.violations).toHaveLength(0);
```

## Testing Workflows

### Pre-Release Testing Checklist

#### Week 1: Foundation Testing
- [ ] Run automated accessibility audit
- [ ] Test keyboard navigation on all major flows
- [ ] Verify screen reader compatibility
- [ ] Check color contrast compliance

#### Week 2: Cross-Browser Testing  
- [ ] Test Tier 1 device/browser combinations
- [ ] Verify responsive breakpoints
- [ ] Test touch interactions on mobile devices
- [ ] Performance testing on slower connections

#### Week 3: Edge Cases & Refinement
- [ ] Test with assistive technologies
- [ ] Verify high contrast mode compatibility
- [ ] Test with reduced motion preferences
- [ ] Orientation change testing

### Continuous Testing

#### Daily
- Automated accessibility tests in CI/CD
- Responsive design visual regression tests

#### Weekly  
- Manual keyboard navigation testing
- Mobile device testing rotation

#### Monthly
- Comprehensive cross-browser testing
- Assistive technology compatibility review
- Performance benchmarking

## Issue Reporting Template

### Accessibility Issues
```
**Issue Type**: [Keyboard Navigation | Screen Reader | Color Contrast | Touch Target]
**WCAG Reference**: [e.g., 2.1.1]
**Severity**: [Critical | High | Medium | Low]
**Device/Browser**: [e.g., iPhone 12 Safari]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
**Actual Result**:
**Screenshot/Video**: [if applicable]
```

### Mobile Responsiveness Issues
```
**Issue Type**: [Layout | Performance | Interaction | Content]
**Device**: [e.g., Samsung Galaxy S21]
**Browser**: [e.g., Chrome Mobile 91]
**Viewport Size**: [e.g., 360×800]
**Orientation**: [Portrait | Landscape]

**Steps to Reproduce**:
1.
2. 
3.

**Expected Result**:
**Actual Result**: 
**Screenshot**: [required]
```

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Mobile Testing
- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [BrowserStack Mobile Testing Guide](https://www.browserstack.com/guide/mobile-testing)

### Screen Readers
- [NVDA](https://www.nvaccess.org/download/) (Windows)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows)
- VoiceOver (macOS/iOS - built-in)
- TalkBack (Android - built-in)

---

*This guide should be updated regularly as new devices, browsers, and accessibility standards emerge.*