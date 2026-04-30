/**
 * BuildFi shared chrome primitives.
 *
 * Single import point for the cross-surface logo, headers, and footers.
 * See docs/DESIGN-SYSTEM.md → "Component primitives" for usage rules.
 */

export { BuildFiLogo } from "./Logo";
export type { BuildFiLogoProps, LogoTheme, LogoSystem, LogoSize } from "./Logo";

export { ProductHeader } from "./ProductHeader";
export type { ProductHeaderProps, NavLink } from "./ProductHeader";

export { ProductFooter } from "./ProductFooter";
export type { ProductFooterProps, FooterLink } from "./ProductFooter";

export { EditorialHeader } from "./EditorialHeader";
export type { EditorialHeaderProps } from "./EditorialHeader";

export { EditorialFooter } from "./EditorialFooter";
export type { EditorialFooterProps } from "./EditorialFooter";
