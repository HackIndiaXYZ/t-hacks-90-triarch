/**
 * Core Type Definitions for TrustID
 */

export interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

export interface AppConfig {
  appName: string;
  tagline: string;
  description: string;
}

export type ThemeMode = "light" | "dark" | "system";
