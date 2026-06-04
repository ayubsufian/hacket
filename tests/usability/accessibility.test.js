// File: tests/usability/accessibility.test.js
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LandingPage from '../../frontend/src/pages/LandingPage';

expect.extend(toHaveNoViolations);

test('LandingPage is accessible (no Axe violations)', async () => {
  const { container } = render(<LandingPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
