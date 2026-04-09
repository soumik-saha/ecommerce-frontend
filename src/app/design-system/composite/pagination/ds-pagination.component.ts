import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ds-pagination',
  standalone: true,
  template: `
    <nav class="row row-between mt-md" aria-label="Pagination">
      <span class="muted">Page {{ currentPage() }} of {{ totalPages() }}</span>
      <div class="row">
        <button type="button" class="secondary" (click)="onPrevious()" [disabled]="currentPage() <= 1">Previous</button>
        <button type="button" class="secondary" (click)="onNext()" [disabled]="currentPage() >= totalPages()">Next</button>
      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsPaginationComponent {
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly previous = output<void>();
  readonly next = output<void>();

  protected onPrevious(): void {
    this.previous.emit();
  }

  protected onNext(): void {
    this.next.emit();
  }
}
