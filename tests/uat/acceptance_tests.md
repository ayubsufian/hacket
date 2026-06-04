# UAT: Acceptance Test Cases for HackET Platform

This document lists high-level acceptance criteria (from project objectives) and their test outcomes.

| Criteria                               | Test Scenario                           | Expected Outcome                 | Status (Pass/Fail) | Remarks                        |
|----------------------------------------|-----------------------------------------|----------------------------------|--------------------|--------------------------------|
| Bilingual Interface                    | Switch app language from English to Amharic and back | All labels, buttons, and messages appear correctly translated (matching dictionary) | Pass (see *Usability tests*) | Verified on key pages (login, dashboard) |
| Multi-tenant Centralization            | Two organizers create events; events only visible under respective org’s scope | Each organizer sees only their own events under their account | Pass | Verified via API: organizer A cannot edit events of B |
| Participant Data Continuity            | Participant registers to multiple events; profile retains history of participation | Participant profile shows list of past hackathons and team history | Pass | Verified by navigating to Profile page |
| Secure Registration/Login (UC0001/2)   | Register with valid details and login; invalid credentials blocked | New account is created, login returns JWT; wrong password denied | Pass | Duplicated email yields 400 error |
| Automatic Session Expiration (UC0004)  | Leave session idle beyond timeout; then attempt action | User is logged out or token invalidated, requiring re-login | Pass (simulated) | Timeout set short for testing |
| Notifications Delivery                 | Trigger event notifications (e.g., new event posted); user receives updates | Notification appears in user’s notification list; email (if enabled) sent | Pass (email mocked) | Simulated via DB event logs |
| Real-time Updates (Leaderboard)        | Submit a project and have judges score it; leaderboard updates | Leaderboard reflects new score within a few seconds | Pass | Real-time updates via Socket.IO tested locally |
| System Reliability                     | Perform common actions repeatedly (registration, event creation) without errors | All actions complete successfully, no crashes or data loss | Pass | Load testing pending |
| Translation Accuracy                   | Key content in Amharic matches expected meaning in English | Core phrases correctly translated (verified by bilingual user) | Pass | Preliminary review by team member |
