import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient } from '../core/api-client';
import { AddressBookStore } from '../core/address-book.store';
import { AuditLogStore } from '../core/audit-log.store';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';
import { UserPreferencesStore } from '../core/user-preferences.store';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Account Settings</h2>
        <button type="button" class="secondary" (click)="reload()" [disabled]="loading()">Reload</button>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }
      @if (message()) { <p class="ok">{{ message() }}</p> }

      <section class="grid two mb-md">
        <article class="page p-md">
          <h3 class="section-title">Avatar</h3>
          <div class="row row-start">
            <img [src]="avatarPreview()" alt="User avatar preview" class="profile-avatar">
            <div class="grid content-flex-1">
              <label class="label">
                Avatar URL
                <input type="text" [value]="preferences().avatarUrl" (input)="setAvatarUrl($event)" placeholder="https://...">
              </label>
              <label class="label">
                Upload image
                <input type="file" accept="image/*" (change)="uploadAvatar($event)" aria-label="Upload avatar image">
              </label>
            </div>
          </div>
        </article>

        <article class="page p-md">
          <h3 class="section-title">Preferences</h3>
          <label class="row">
            <input type="checkbox" [checked]="preferences().compactMode" (change)="toggleCompact($event)" class="input-auto" aria-label="Toggle compact layout mode">
            <span>Compact layout mode</span>
          </label>
          <label class="row">
            <input type="checkbox" [checked]="preferences().emailNotifications" (change)="toggleEmailNotif($event)" class="input-auto" aria-label="Toggle email notifications">
            <span>Email notifications</span>
          </label>
          <label class="row">
            <input type="checkbox" [checked]="preferences().marketingNotifications" (change)="toggleMarketingNotif($event)" class="input-auto" aria-label="Toggle marketing notifications">
            <span>Marketing notifications</span>
          </label>
        </article>
      </section>

      <form class="grid two" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <label class="label">First Name
          <input type="text" formControlName="firstName">
          @if (isInvalid('firstName')) { <small class="field-error">Required.</small> }
        </label>
        <label class="label">Last Name
          <input type="text" formControlName="lastName">
          @if (isInvalid('lastName')) { <small class="field-error">Required.</small> }
        </label>
        <label class="label">Email
          <input type="email" formControlName="email">
          @if (isInvalid('email')) { <small class="field-error">Valid email required.</small> }
        </label>
        <label class="label">Phone
          <input type="text" formControlName="phone">
          @if (isInvalid('phone')) { <small class="field-error">Phone is required.</small> }
        </label>

        <div class="grid two address-grid-full" formGroupName="address">
          <label class="label">Street <input type="text" formControlName="street"></label>
          <label class="label">City <input type="text" formControlName="city"></label>
          <label class="label">State <input type="text" formControlName="state"></label>
          <label class="label">Zipcode <input type="text" formControlName="zipcode"></label>
          <label class="label address-grid-full">Country <input type="text" formControlName="country"></label>
        </div>

        <div class="row address-grid-full">
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Saving...' : 'Save Profile' }}</button>
          <button type="button" class="secondary" (click)="saveAddress()" [disabled]="!canSaveAddress()">Save Address Book Entry</button>
        </div>
      </form>

      <section class="mt-lg">
        <div class="toolbar">
          <h3 class="section-title">Saved Addresses</h3>
          <span class="muted">{{ addresses().length }} entries</span>
        </div>

        @if (addresses().length === 0) {
          <p class="muted">No saved addresses yet.</p>
        }

        @for (entry of addresses(); track entry.id) {
          <article class="row row-between divider-bottom list-row">
            <div>
              <strong>{{ entry.label }}</strong>
              <p class="muted">
                {{ entry.address.street }}, {{ entry.address.city }}, {{ entry.address.state }} {{ entry.address.zipcode }}, {{ entry.address.country }}
              </p>
            </div>
            <div class="row">
              <button type="button" class="secondary" (click)="applyAddress(entry.id)">Use</button>
              <button type="button" class="secondary" (click)="removeAddress(entry.id)">Delete</button>
            </div>
          </article>
        }
      </section>
    </section>
  `
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly session = inject(SessionStore);
  private readonly addressBook = inject(AddressBookStore);
  private readonly audit = inject(AuditLogStore);
  private readonly toast = inject(UiToastService);
  private readonly preferencesStore = inject(UserPreferencesStore);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly addresses = this.addressBook.addresses;
  protected readonly preferences = this.preferencesStore.preferences;
  protected readonly avatarPreview = computed(() => this.preferences().avatarUrl || 'https://placehold.co/100x100?text=U');

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    address: this.fb.nonNullable.group({
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipcode: ['', [Validators.required]],
      country: ['', [Validators.required]]
    })
  });

  protected readonly canSaveAddress = computed(() => {
    const address = this.profileForm.controls.address;
    return address.valid;
  });

  constructor() {
    this.reload();
  }

  protected isInvalid(control: 'firstName' | 'lastName' | 'email' | 'phone'): boolean {
    const field = this.profileForm.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected setAvatarUrl(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.preferencesStore.update({ avatarUrl: input.value.trim() });
  }

  protected uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = String(reader.result || '');
      this.preferencesStore.update({ avatarUrl: nextUrl });
      this.log('PROFILE_AVATAR_UPLOAD', 'profile');
      this.toast.success('Avatar updated');
    };
    reader.onerror = () => this.toast.error('Could not read avatar file');
    reader.readAsDataURL(file);
  }

  protected toggleCompact(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.preferencesStore.update({ compactMode: checked });
    this.log('PREFERENCE_COMPACT_MODE', 'preference', undefined, String(checked));
    this.toast.info(checked ? 'Compact mode enabled' : 'Compact mode disabled');
  }

  protected toggleEmailNotif(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.preferencesStore.update({ emailNotifications: checked });
    this.log('PREFERENCE_EMAIL_NOTIFICATIONS', 'preference', undefined, String(checked));
  }

  protected toggleMarketingNotif(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.preferencesStore.update({ marketingNotifications: checked });
    this.log('PREFERENCE_MARKETING_NOTIFICATIONS', 'preference', undefined, String(checked));
  }

  protected reload(): void {
    const userId = this.session.currentUserId();
    if (!userId) {
      this.error.set('No active user session. Please log in again.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.api.getUser(userId).subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address
        });
      },
      error: (error) => {
        const message = this.session.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected saveProfile(): void {
    const userId = this.session.currentUserId();
    if (!userId) {
      this.error.set('No active user session. Please log in again.');
      return;
    }

    if (this.profileForm.invalid || this.loading()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');

    this.api.updateUser(userId, this.profileForm.getRawValue()).subscribe({
      next: (text) => {
        this.log('PROFILE_UPDATE', 'user', String(userId));
        this.message.set(text || 'Profile updated successfully');
        this.toast.success('Profile updated');
      },
      error: (error) => {
        const message = this.session.getErrorMessage(error);
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected saveAddress(): void {
    if (!this.canSaveAddress()) {
      this.profileForm.controls.address.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    const label = `${value.firstName} ${value.lastName}`.trim() || 'Address';
    this.addressBook.add(label, value.address);
    this.log('ADDRESS_BOOK_ADD', 'address', undefined, label);
    this.toast.success('Address saved to address book');
  }

  protected applyAddress(addressId: string): void {
    const selected = this.addresses().find((entry) => entry.id === addressId);
    if (!selected) {
      return;
    }

    this.profileForm.controls.address.patchValue(selected.address);
    this.log('ADDRESS_BOOK_APPLY', 'address', selected.id, selected.label);
    this.toast.info('Address applied to profile form');
  }

  protected removeAddress(addressId: string): void {
    this.addressBook.remove(addressId);
    this.log('ADDRESS_BOOK_DELETE', 'address', addressId);
    this.toast.info('Address removed');
  }

  private log(action: string, entity: string, entityId?: string, details?: string): void {
    this.audit.add({
      actor: this.session.currentEmail(),
      action,
      entity,
      entityId,
      details
    });
  }
}
