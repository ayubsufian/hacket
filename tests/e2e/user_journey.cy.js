// File: tests/e2e/user_journey.cy.js
// This is a Cypress test simulating a full user journey in the front-end.

describe('E2E: User Journey - Bilingual Hackathon Platform', () => {
    const baseUrl = 'http://localhost:5173'; // Vite dev server
    it('Participant signs up, logs in, and toggles language', () => {
      // Visit landing page
      cy.visit(baseUrl);
      cy.contains('HackET'); // App title
      
      // Navigate to signup page
      cy.contains('Sign Up').click();
      // Fill form (English)
      cy.get('input[name="email"]').type('e2euser@example.com');
      cy.get('input[name="firstName"]').type('E2E');
      cy.get('input[name="lastName"]').type('User');
      cy.get('input[name="password"]').type('E2Epass123!');
      cy.get('input[name="confirmPassword"]').type('E2Epass123!');
      cy.contains('Submit').click();
      // Should show success or redirect to login
      cy.contains('Login').should('be.visible');
  
      // Now log in
      cy.contains('Email').type('e2euser@example.com');
      cy.get('input[name="password"]').type('E2Epass123!');
      cy.contains('Log In').click();
      // After login, should see participant dashboard
      cy.contains('Available Hackathons').should('exist');
  
      // Toggle language to Amharic
      cy.get('[data-testid="language-switch"]').click();
      cy.contains('ፕሮፊል').should('be.visible'); // "Profile" in Amharic
    });
  
    it('Organizer creates an event and sees it listed', () => {
      // Assume organizer user exists or create one via API
      // For simplicity, login as organizer (hardcoded)
      cy.visit(baseUrl);
      cy.contains('Log In').click();
      cy.get('input[name="email"]').type('organizer@e2e.com');
      cy.get('input[name="password"]').type('OrgPass123!');
      cy.contains('Log In').click();
      cy.contains('Organizer Dashboard').should('exist');
  
      // Create new event
      cy.contains('Create Event').click();
      cy.get('input[name="title"]').type('Cypress Hackathon 2026');
      cy.get('input[name="startDate"]').type('2026-09-10');
      cy.get('input[name="endDate"]').type('2026-09-12');
      cy.contains('Submit').click();
      // Check that new event appears in list
      cy.contains('Cypress Hackathon 2026').should('be.visible');
    });
  });
  