// File: tests/usability/languageSwitch.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import App from '../../frontend/src/App';

test('Language switch changes UI text to Amharic', () => {
  const { getByTestId, getByText } = render(<App />);
  // Assume the app has a button with data-testid="lang-btn"
  const switchBtn = getByTestId('lang-btn');
  fireEvent.click(switchBtn);
  // Check that a known English text is replaced by Amharic
  expect(getByText('ፕሮፊል')).toBeInTheDocument(); // "Profile" in Amharic
});
