import type { GlobalThemeOverrides } from 'naive-ui';

/**
 * Naive UI theme aligned with the design tokens in `styles/tokens.css`
 * (docs/07-dashboard-design.md §3): indigo accent, slate neutrals, 8 px controls, 12 px cards.
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#4F46E5',
    primaryColorHover: '#4338CA',
    primaryColorPressed: '#3730A3',
    primaryColorSuppl: '#4F46E5',
    successColor: '#10B981',
    warningColor: '#D97706',
    errorColor: '#EF4444',
    errorColorHover: '#DC2626',
    errorColorPressed: '#B91C1C',
    textColorBase: '#0F172A',
    textColor1: '#0F172A',
    textColor2: '#0F172A',
    textColor3: '#64748B',
    placeholderColor: '#94A3B8',
    borderColor: '#E2E8F0',
    dividerColor: '#E2E8F0',
    bodyColor: '#F8FAFC',
    borderRadius: '8px',
    borderRadiusSmall: '8px',
    heightMedium: '36px',
    heightSmall: '30px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontFamilyMono:
      "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  Card: { borderRadius: '12px' },
  Tabs: { tabTextColorLine: '#64748B', tabTextColorActiveLine: '#0F172A' },
};
