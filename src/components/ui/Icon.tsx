/**
 * Icon — wraps Material Symbols Rounded web font.
 *
 * IMPORTANT: Icon names (home, chevron_left, etc.) are NEVER translated.
 * Always pass the icon name as a literal string prop, never via t().
 *
 * RTL chevron flipping: use the `flip` prop to auto-flip directional icons.
 * Example: <Icon name="chevron_left" flip /> renders as chevron_right in RTL.
 */
import { cn } from '@/utils/cn';

interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Auto-flip icon for RTL layouts (for directional icons like chevrons, arrows) */
  flip?: boolean;
}

export function Icon({ name, filled = false, size = 24, className, style, flip = false }: IconProps) {
  return (
    <span
      className={cn(
        'material-symbols-rounded select-none',
        filled && 'filled',
        // flip class uses CSS transform scaleX(-1) when [dir=rtl] is set
        flip && 'icon-flip',
        className
      )}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
