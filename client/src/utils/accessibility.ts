// WCAG 2.1 AA Compliance Utilities for ScholarLink

import { RefObject, useEffect, useRef, useState, useCallback } from 'react';

// WCAG Color Contrast Requirements
export const WCAG_CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5
} as const;

// Focus Management Utilities
export class FocusManager {
  private static trapStack: HTMLElement[] = [];
  
  // Trap focus within a container (for modals, dropdowns)
  static trapFocus(container: HTMLElement): () => void {
    this.trapStack.push(container);
    
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      this.trapStack.pop();
    };
  }
  
  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    
    return Array.from(container.querySelectorAll(selector))
      .filter(el => this.isVisible(el)) as HTMLElement[];
  }
  
  // Check if element is visible
  private static isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }
  
  // Restore focus to previously focused element
  static restoreFocus(previousElement?: HTMLElement) {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }
}

// Custom hooks for accessibility
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const cleanup = FocusManager.trapFocus(containerRef.current);
    return cleanup;
  }, [isActive]);
  
  return containerRef;
}

export function useAnnounceToScreenReader() {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(`${priority}:${message}`);
    
    // Clear after announcement
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);
  
  return { announcement, announce };
}

// Keyboard Navigation Utilities
export const KeyboardNavigation = {
  // Handle arrow key navigation for lists
  handleArrowNavigation: (
    e: KeyboardEvent, 
    items: HTMLElement[], 
    currentIndex: number
  ): number => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        return Math.min(currentIndex + 1, items.length - 1);
      case 'ArrowUp':
        e.preventDefault();
        return Math.max(currentIndex - 1, 0);
      case 'Home':
        e.preventDefault();
        return 0;
      case 'End':
        e.preventDefault();
        return items.length - 1;
      default:
        return currentIndex;
    }
  },
  
  // Handle escape key for closing modals/dropdowns
  handleEscape: (e: KeyboardEvent, onEscape: () => void) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
    }
  },
  
  // Handle enter/space for button-like elements
  handleActivation: (e: KeyboardEvent, onActivate: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  }
};

// Touch and Mobile Accessibility
export const TouchAccessibility = {
  // Minimum touch target size (44px x 44px per WCAG)
  MIN_TOUCH_TARGET_SIZE: 44,
  
  // Check if touch target meets minimum size requirement
  isTouchTargetSufficient: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width >= TouchAccessibility.MIN_TOUCH_TARGET_SIZE && 
           rect.height >= TouchAccessibility.MIN_TOUCH_TARGET_SIZE;
  },
  
  // Add touch-friendly attributes
  makeTouchFriendly: (element: HTMLElement) => {
    // Ensure minimum touch target size
    const rect = element.getBoundingClientRect();
    if (!TouchAccessibility.isTouchTargetSufficient(element)) {
      element.style.minWidth = `${TouchAccessibility.MIN_TOUCH_TARGET_SIZE}px`;
      element.style.minHeight = `${TouchAccessibility.MIN_TOUCH_TARGET_SIZE}px`;
    }
    
    // Add touch-action for better gesture handling
    element.style.touchAction = 'manipulation';
  }
};

// ARIA Utilities
export const AriaUtils = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Set ARIA attributes for form field associations
  associateFormField: (input: HTMLElement, label?: HTMLElement, error?: HTMLElement, help?: HTMLElement) => {
    const inputId = input.id || AriaUtils.generateId('input');
    input.id = inputId;
    
    const describedBy: string[] = [];
    
    if (label) {
      label.setAttribute('for', inputId);
    }
    
    if (error) {
      const errorId = error.id || AriaUtils.generateId('error');
      error.id = errorId;
      error.setAttribute('role', 'alert');
      error.setAttribute('aria-live', 'assertive');
      describedBy.push(errorId);
    }
    
    if (help) {
      const helpId = help.id || AriaUtils.generateId('help');
      help.id = helpId;
      describedBy.push(helpId);
    }
    
    if (describedBy.length > 0) {
      input.setAttribute('aria-describedby', describedBy.join(' '));
    }
  },
  
  // Set ARIA attributes for expandable content
  setExpandableAttributes: (trigger: HTMLElement, content: HTMLElement, isExpanded: boolean) => {
    const contentId = content.id || AriaUtils.generateId('expandable');
    content.id = contentId;
    
    trigger.setAttribute('aria-controls', contentId);
    trigger.setAttribute('aria-expanded', isExpanded.toString());
    
    if (!isExpanded) {
      content.setAttribute('aria-hidden', 'true');
    } else {
      content.removeAttribute('aria-hidden');
    }
  }
};

// Screen Reader Utilities
export const ScreenReaderUtils = {
  // Create visually hidden but screen reader accessible content
  createSROnlyElement: (text: string): HTMLElement => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },
  
  // Add screen reader only instructions
  addSRInstructions: (element: HTMLElement, instructions: string) => {
    const srElement = ScreenReaderUtils.createSROnlyElement(instructions);
    element.appendChild(srElement);
  }
};

// WCAG Testing Utilities
export const WCAGTesting = {
  // Test color contrast ratio
  getContrastRatio: (foreground: string, background: string): number => {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      // Calculate relative luminance
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };
    
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  // Check if contrast meets WCAG standards
  meetsContrastRequirement: (
    foreground: string, 
    background: string, 
    level: keyof typeof WCAG_CONTRAST_RATIOS = 'AA_NORMAL'
  ): boolean => {
    const ratio = WCAGTesting.getContrastRatio(foreground, background);
    return ratio >= WCAG_CONTRAST_RATIOS[level];
  },
  
  // Audit page for accessibility issues
  auditAccessibility: (container: HTMLElement = document.body): {
    errors: string[];
    warnings: string[];
    passed: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];
    
    // Check for missing alt text on images
    const images = container.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        errors.push(`Image ${index + 1} missing alt text`);
      } else {
        passed.push(`Image ${index + 1} has alt text`);
      }
    });
    
    // Check for form inputs without labels
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const hasLabel = container.querySelector(`label[for="${input.id}"]`) ||
                      input.getAttribute('aria-label') ||
                      input.getAttribute('aria-labelledby');
      
      if (!hasLabel) {
        errors.push(`Form input ${index + 1} missing label`);
      } else {
        passed.push(`Form input ${index + 1} has proper labeling`);
      }
    });
    
    // Check for buttons without accessible names
    const buttons = container.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const hasAccessibleName = button.textContent?.trim() ||
                               button.getAttribute('aria-label') ||
                               button.getAttribute('aria-labelledby');
      
      if (!hasAccessibleName) {
        errors.push(`Button ${index + 1} missing accessible name`);
      } else {
        passed.push(`Button ${index + 1} has accessible name`);
      }
    });
    
    // Check for sufficient touch target sizes
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
    interactiveElements.forEach((element, index) => {
      if (!TouchAccessibility.isTouchTargetSufficient(element as HTMLElement)) {
        warnings.push(`Interactive element ${index + 1} may be too small for touch`);
      } else {
        passed.push(`Interactive element ${index + 1} meets touch target size`);
      }
    });
    
    return { errors, warnings, passed };
  }
};

// All utilities are already exported above