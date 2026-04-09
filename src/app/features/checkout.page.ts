import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AddressBookStore } from '../core/address-book.store';
import { ApiClient } from '../core/api-client';
import { Order } from '../core/models';
import { SessionStore } from '../core/session.store';
import { UiToastService } from '../core/ui-toast.service';

@Component({
  selector: 'app-checkout-page',
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="toolbar">
        <h2 class="title">Checkout</h2>
        <a class="btn secondary" routerLink="/cart">Back to cart</a>
      </div>

      <p class="muted">Review shipping and payment details before placing the order.</p>

      <form class="grid" [formGroup]="checkoutForm" (ngSubmit)="placeOrder()">
        <div class="row row-between">
          <h3 class="section-title">Shipping Address</h3>
          @if (savedAddresses().length > 0) {
            <label class="label max-w-280">
              Use saved address
              <select (change)="selectAddress($event)" aria-label="Select a saved shipping address">
                <option value="">Select saved address</option>
                @for (saved of savedAddresses(); track saved.id) {
                  <option [value]="saved.id">{{ saved.label }} - {{ saved.address.city }}</option>
                }
              </select>
            </label>
          }
        </div>

        <div class="grid two" formGroupName="address">
          <label class="label">Street
            <input type="text" formControlName="street">
            @if (invalidAddress('street')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">City
            <input type="text" formControlName="city">
            @if (invalidAddress('city')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">State
            <input type="text" formControlName="state">
            @if (invalidAddress('state')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label">Zipcode
            <input type="text" formControlName="zipcode">
            @if (invalidAddress('zipcode')) { <small class="field-error">Required.</small> }
          </label>
          <label class="label address-grid-full">Country
            <input type="text" formControlName="country">
            @if (invalidAddress('country')) { <small class="field-error">Required.</small> }
          </label>
        </div>

        <div class="row row-between">
          <label class="label max-w-380">
            Save this address as
            <input type="text" formControlName="addressLabel" placeholder="Home, Office, Family">
          </label>
          <button type="button" class="secondary" (click)="saveCurrentAddress()" [disabled]="!canSaveAddress()">Save Address</button>
        </div>

        <h3 class="section-title">Payment</h3>
        <div class="grid two">
          <label class="label">Payment Method
            <select formControlName="paymentMethod">
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="cod">Cash on Delivery</option>
            </select>
          </label>
          <label class="label">Reference
            <input type="text" formControlName="paymentRef" placeholder="Card last 4 / UPI id">
            @if (invalid('paymentRef')) { <small class="field-error">Reference is required.</small> }
          </label>
        </div>

        <label class="row row-start">
          <input type="checkbox" formControlName="acceptTerms" class="input-auto" aria-label="Accept checkout terms">
          <span>I confirm delivery details and accept checkout terms.</span>
        </label>
        @if (invalid('acceptTerms')) { <small class="field-error">You must accept checkout terms.</small> }

        @if (error()) { <p class="error">{{ error() }}</p> }
        @if (message()) { <p class="ok">{{ message() }}</p> }

        <div class="row">
          <button type="submit" [disabled]="loading()">{{ loading() ? 'Processing...' : 'Place Order' }}</button>
          <a class="btn secondary" routerLink="/orders">View order history</a>
        </div>
      </form>

      @if (order(); as placed) {
        <article class="page mt-md">
          <h3>Order #{{ placed.id }}</h3>
          <p class="muted">Status: {{ placed.status }}</p>
          <p><strong>Total: {{ placed.totalAmount | currency:'INR' }}</strong></p>

          <h4>Items</h4>
          @for (item of placed.items; track item.id) {
            <p class="muted">
              Product #{{ item.productId }} • Qty {{ item.quantity }} • {{ item.price | currency:'INR' }}
            </p>
          }
        </article>
      }
    </section>
  `
})
export class CheckoutPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly toast = inject(UiToastService);
  private readonly addressBook = inject(AddressBookStore);

  protected readonly order = signal<Order | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly savedAddresses = this.addressBook.addresses;
  protected readonly checkoutForm = this.fb.nonNullable.group({
    address: this.fb.nonNullable.group({
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipcode: ['', [Validators.required]],
      country: ['', [Validators.required]]
    }),
    addressLabel: ['Home'],
    paymentMethod: ['card', [Validators.required]],
    paymentRef: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  });

  protected readonly canSaveAddress = computed(() => {
    const address = this.checkoutForm.controls.address;
    const label = this.checkoutForm.controls.addressLabel.value.trim();
    return address.valid && label.length > 0;
  });

  protected invalid(control: 'paymentRef' | 'acceptTerms'): boolean {
    const field = this.checkoutForm.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected invalidAddress(control: 'street' | 'city' | 'state' | 'zipcode' | 'country'): boolean {
    const field = this.checkoutForm.controls.address.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected selectAddress(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selected = this.savedAddresses().find((entry) => entry.id === select.value);
    if (!selected) {
      return;
    }

    this.checkoutForm.controls.address.patchValue(selected.address);
    this.checkoutForm.controls.addressLabel.setValue(selected.label);
    this.toast.info('Saved address applied');
  }

  protected saveCurrentAddress(): void {
    if (!this.canSaveAddress()) {
      this.checkoutForm.controls.address.markAllAsTouched();
      return;
    }

    this.addressBook.add(
      this.checkoutForm.controls.addressLabel.value,
      this.checkoutForm.controls.address.getRawValue()
    );
    this.toast.success('Address saved');
  }

  protected placeOrder(): void {
    if (this.checkoutForm.invalid || this.loading()) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');

    this.api.createOrder().subscribe({
      next: (response) => {
        this.order.set(response);
        this.message.set('Order placed successfully');
        this.toast.success('Order placed successfully');
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
