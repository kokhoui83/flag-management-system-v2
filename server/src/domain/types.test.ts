import { describe, it, expect } from 'vitest';
import { effectiveCapability, isFullAccess, type EffectiveRole } from './types';

describe('domain: effective capability (FR-54 capability matrix)', () => {
  it('grants full admin capability when the global role is admin', () => {
    expect(effectiveCapability('ADMIN', 'DEVELOPER')).toBe('admin');
    expect(effectiveCapability('admin', 'developer')).toBe('admin');
  });

  it('elevate a developer to project-scoped admin through a strong membership (FR-54)', () => {
    expect(effectiveCapability('DEVELOPER', 'ADMIN')).toBe('admin');
    expect(effectiveCapability('developer', 'admin')).toBe('admin');
  });

  it('keeps the developer capability for an even developer membership', () => {
    expect(effectiveCapability('DEVELOPER', 'DEVELOPER')).toBe('developer');
  });

  it('unions a global developer with a product-owner membership to the stronger developer capability', () => {
    expect(effectiveCapability('DEVELOPER', 'PRODUCT_OWNER')).toBe('developer');
  });

  it('keeps the product-owner capability for a product-owner global + membership pair', () => {
    expect(effectiveCapability('PRODUCT_OWNER', 'PRODUCT_OWNER')).toBe('product-owner');
  });

  it('returns no capability when the caller has neither a global admin nor a project membership', () => {
    expect(effectiveCapability('DEVELOPER', null)).toBeNull();
    expect(effectiveCapability('PRODUCT_OWNER', null)).toBeNull();
    expect(effectiveCapability(null, null)).toBeNull();
  });

  it('isFullAccess is only true for the admin capability', () => {
    const admin: EffectiveRole = 'admin';
    const developer: EffectiveRole = 'developer';
    const productOwner: EffectiveRole = 'product-owner';
    expect(isFullAccess(admin)).toBe(true);
    expect(isFullAccess(developer)).toBe(false);
    expect(isFullAccess(productOwner)).toBe(false);
  });
});
