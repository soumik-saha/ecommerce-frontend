import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ds-input',
  standalone: true,
  template: `
    <label class="label">
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <input
        [type]="type()"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel() || label() || null"
        (input)="onInput($event)"
      >
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsInputComponent {
  readonly label = input('');
  readonly value = input('');
  readonly type = input('text');
  readonly placeholder = input('');
  readonly ariaLabel = input('');

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
