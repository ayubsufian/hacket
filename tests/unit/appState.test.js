// File: tests/unit/appState.test.js
import { getDashboardRoute, setActiveWorkspace, clearActiveWorkspace } from '../../frontend/src/utils/appState';

describe('Frontend: getDashboardRoute', () => {
  test('Returns correct route for each user role', () => {
    expect(getDashboardRoute('ADMIN')).toBe('/admin');
    expect(getDashboardRoute('ORGANIZER')).toBe('/organizer');
    expect(getDashboardRoute('JUDGE')).toBe('/judge');
    expect(getDashboardRoute('MENTOR')).toBe('/judge'); // MENTOR maps to /judge
    expect(getDashboardRoute('PARTICIPANT')).toBe('/dashboard');
    expect(getDashboardRoute(null)).toBe('/login'); // default fallback
  });
});

describe('Frontend: Active workspace in localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('setActiveWorkspace stores IDs in localStorage', () => {
    setActiveWorkspace({ teamId: 'T123', hackathonId: 'H456' });
    expect(localStorage.getItem('hacket_active_team_id')).toBe('T123');
    expect(localStorage.getItem('hacket_active_hackathon_id')).toBe('H456');
  });

  test('clearActiveWorkspace removes IDs from localStorage', () => {
    localStorage.setItem('hacket_active_team_id', 'T123');
    localStorage.setItem('hacket_active_hackathon_id', 'H456');
    clearActiveWorkspace();
    expect(localStorage.getItem('hacket_active_team_id')).toBeNull();
    expect(localStorage.getItem('hacket_active_hackathon_id')).toBeNull();
  });
});
