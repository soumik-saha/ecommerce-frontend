import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '../core/api-client';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Create Account</h2>
        <span class="muted">Customer onboarding</span>
      </div>

      <form class="grid two" [formGroup]="form" (ngSubmit)="submit()">
        <label class="label">
          First Name
          <input type="text" formControlName="firstName">
          @if (showError('firstName')) { <small class="field-error">First name is required.</small> }
        </label>

        <label class="label">
          Last Name
          <input type="text" formControlName="lastName">
          @if (showError('lastName')) { <small class="field-error">Last name is required.</small> }
        </label>

        <label class="label">
          Email
          <input type="email" formControlName="email">
          @if (showError('email')) { <small class="field-error">Valid email is required.</small> }
        </label>

        <label class="label">
          Phone
          <input type="text" formControlName="phone" placeholder="10 to 14 digits">
          @if (showError('phone')) { <small class="field-error">Enter a valid phone number.</small> }
        </label>

        <label class="label">
          Password
          <input type="password" formControlName="password">
          @if (showError('password')) {
            <small class="field-error">Use at least 8 chars with upper/lower/number/special.</small>
          }
        </label>

        <label class="label">
          Confirm Password
          <input type="password" formControlName="confirmPassword">
          @if (showError('confirmPassword') || form.hasError('passwordMismatch')) {
            <small class="field-error">Passwords must match.</small>
          }
        </label>

        <div class="grid two address-grid-full" formGroupName="address">
          <label class="label">
            Street
            <input type="text" formControlName="street">
            @if (showAddressError('street')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">
            City
            <input type="text" formControlName="city">
            @if (showAddressError('city')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">
            State
            <input type="text" formControlName="state">
            @if (showAddressError('state')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">
            Zipcode
            <input type="text" formControlName="zipcode">
            @if (showAddressError('zipcode')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label address-grid-full">
            Country
            <input type="text" formControlName="country">
            @if (showAddressError('country')) { <small class="field-error">Required.</small> }
          </label>
        </div>

        @if (error()) { <p class="error address-grid-full">{{ error() }}</p> }

        <div class="row address-grid-full">
          <button [disabled]="loading()">{{ loading() ? 'Creating...' : 'Create account' }}</button>
          <a class="btn secondary" routerLink="/login">Back to login</a>
        </div>
      </form>
    </section>
  `
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(UiToastService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\-\s]{10,14}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/)
        ]
      ],
      confirmPassword: ['', [Validators.required]],
      address: this.fb.nonNullable.group({
        street: ['', [Validators.required]],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        zipcode: ['', [Validators.required]],
        country: ['', [Validators.required]]
      })
    },
    { validators: passwordMatchValidator }
  );

  protected showError(controlName: 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected showAddressError(controlName: 'street' | 'city' | 'state' | 'zipcode' | 'country'): boolean {
    const control = this.form.controls.address.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const payload = this.form.getRawValue();

    this.api.register({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      address: payload.address
    }).subscribe({
      next: (response) => {
        this.store.set(response);
        this.toast.success('Account created successfully');
        void this.router.navigate(['/products']);
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
