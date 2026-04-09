import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-button',
  standalone: true,
  template: `<button [type]="type()" [class.secondary]="variant() === 'secondary'" [attr.aria-label]="ariaLabel() || null"><ng-content /></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<'primary' | 'secondary'>('primary');
  readonly ariaLabel = input('');
}
