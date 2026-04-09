import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface DsSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'ds-select',
  standalone: true,
  template: `
    <label class="label">
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <select [value]="value()" [attr.aria-label]="ariaLabel() || label() || null" (change)="onChange($event)">
        @for (option of options(); track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsSelectComponent {
  readonly label = input('');
  readonly value = input('');
  readonly ariaLabel = input('');
  readonly options = input<DsSelectOption[]>([]);
  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.valueChange.emit(target.value);
  }
}
