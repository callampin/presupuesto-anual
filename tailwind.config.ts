import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./src/client/index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Familjen Grotesk Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Familjen Grotesk Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Colores semánticos del dominio financiero (AGENTS.md §5.1)
        income: 'hsl(var(--income))',
        bills: 'hsl(var(--bills))',
        expenses: 'hsl(var(--expenses))',
        savings: 'hsl(var(--savings))',
        debt: 'hsl(var(--debt))',
        warning: 'hsl(var(--warning))',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
} satisfies Config
