import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page auth-shell">
      <div class="toolbar">
        <h2 class="title">Sign In</h2>
        <span class="muted">Secure JWT session</span>
      </div>

      <form class="grid" [formGroup]="form" (ngSubmit)="submit()" aria-label="Login form">
        <label class="label">
          Email
          <input type="email" formControlName="email" placeholder="you@company.com" aria-label="Email address">
          @if (isInvalid('email')) { <small class="field-error">{{ emailError() }}</small> }
        </label>

        <label class="label">
          Password
          <input type="password" formControlName="password" placeholder="Enter your password" aria-label="Password">
          @if (isInvalid('password')) { <small class="field-error">Password is required.</small> }
        </label>

        @if (error()) { <p class="error">{{ error() }}</p> }

        <button [disabled]="loading()">{{ loading() ? 'Please wait...' : 'Login' }}</button>
      </form>

      <p class="muted">No account yet? <a routerLink="/register">Create one here</a></p>
    </section>
  `
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(UiToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected isInvalid(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected emailError(): string {
    const email = this.form.controls.email;
    if (email.hasError('required')) {
      return 'Email is required.';
    }
    return 'Enter a valid email address.';
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.getRawValue();
    this.api.login({ email, password }).subscribe({
      next: (response) => {
        this.store.set(response);
        this.toast.success('Welcome back');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/products';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        const message = this.store.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
