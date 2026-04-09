import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { Product } from '../../core/models';
import { SessionStore } from '../../core/session.store';
import { createResourceState } from '../../core/state/resource-state';

export interface HomeBanner {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaRoute: string;
  imageUrl: string;
}

export interface HomeCategory {
  id: string;
  name: string;
  description: string;
  route: string;
}

interface HomeViewData {
  banners: HomeBanner[];
  recommendations: Product[];
  trending: Product[];
  categories: HomeCategory[];
}

@Injectable({ providedIn: 'root' })
export class HomeStore {
  private readonly api = inject(ApiClient);
  private readonly session = inject(SessionStore);
  private readonly state = signal(createResourceState<HomeViewData>({
    banners: [
      {
        id: 'b1',
        eyebrow: 'Seasonal Campaign',
        title: 'Summer Launch Week',
        description: 'Discover fresh arrivals with optimized delivery windows across top metros.',
        ctaText: 'Shop New Arrivals',
        ctaRoute: '/products',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
      },
      {
        id: 'b2',
        eyebrow: 'Premium Members',
        title: 'Smart Picks For You',
        description: 'AI-ranked recommendations based on browsing, wishlist and purchase signals.',
        ctaText: 'View Recommendations',
        ctaRoute: '/products',
        imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80'
      }
    ],
    categories: [
      {
        id: 'c1',
        name: 'Electronics',
        description: 'Phones, laptops, accessories, and smart-home essentials.',
        route: '/products'
      },
      {
        id: 'c2',
        name: 'Fashion',
        description: 'Curated trends for men, women and kids with premium brands.',
        route: '/products'
      },
      {
        id: 'c3',
        name: 'Home Living',
        description: 'Furniture, decor, kitchen tools and everyday utility products.',
        route: '/products'
      },
      {
        id: 'c4',
        name: 'Sports & Fitness',
        description: 'Performance gear and wellness accessories for active lifestyles.',
        route: '/products'
      }
    ],
    recommendations: [],
    trending: []
  }));

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly banners = computed(() => this.state().data.banners);
  readonly categories = computed(() => this.state().data.categories);
  readonly recommendations = computed(() => this.state().data.recommendations);
  readonly trending = computed(() => this.state().data.trending);
  readonly personalizedTitle = computed(() => this.session.isAuthenticated() ? 'Recommended For You' : 'Popular Right Now');

  load(): void {
    this.state.update((current) => ({ ...current, loading: true, error: null }));

    forkJoin({
      recommendations: this.api.listProducts({ page: 0, size: 8, keyword: '' }),
      trending: this.api.listProducts({ page: 1, size: 8, keyword: '' })
    }).subscribe({
      next: ({ recommendations, trending }) => {
        const recommended = recommendations.content ?? [];
        const trendingContent = trending.content ?? [];

        this.state.update((current) => ({
          ...current,
          loading: false,
          lastUpdatedAt: Date.now(),
          data: {
            ...current.data,
            recommendations: rankByDemand(recommended),
            trending: rankByDemand(trendingContent)
          }
        }));
      },
      error: (error: unknown) => {
        const message = this.session.getErrorMessage(error);
        this.state.update((current) => ({ ...current, loading: false, error: message }));
      }
    });
  }
}

function rankByDemand(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const scoreA = Number(a.rating ?? 0) * 100 + Number(a.reviewCount ?? 0) + Number(a.stockQuantity ?? 0) / 100;
    const scoreB = Number(b.rating ?? 0) * 100 + Number(b.reviewCount ?? 0) + Number(b.stockQuantity ?? 0) / 100;
    return scoreB - scoreA;
  });
}
