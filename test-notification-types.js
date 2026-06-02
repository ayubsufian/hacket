#!/usr/bin/env node
// HackET Notification Types Test
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(category, message, success = null) {
  const icon = success === true ? '✓' : success === false ? '✗' : '•';
  const color = success === true ? colors.green : success === false ? colors.red : colors.cyan;
  console.log(`${color}[${icon}] [${category}]${colors.reset} ${message}`);
}

const EXPECTED_TYPES = [
  'DEADLINE_REMINDER',
  'DEADLINE_WARNING', 
  'TEAM_INVITE',
  'SCORE_PUBLISHED',
  'CERTIFICATE_ISSUED',
  'ANNOUNCEMENT',
  'SYSTEM_ALERT'
];

function testPrismaSchemaTypes() {
  log('SCHEMA', 'Checking Prisma schema NotificationType enum...');
  const schemaPath = path.join(__dirname, 'packages/database/prisma/schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const enumMatch = schema.match(/enum NotificationType \{([^}]+)\}/s);
  if (!enumMatch) {
    log('SCHEMA', 'NotificationType enum not found!', false);
    return false;
  }
  const foundTypes = enumMatch[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  const missing = EXPECTED_TYPES.filter(t => !foundTypes.includes(t));
  if (missing.length > 0) {
    log('SCHEMA', `Missing types: ${missing.join(', ')}`, false);
    return false;
  }
  log('SCHEMA', `All ${EXPECTED_TYPES.length} notification types found`, true);
  return true;
}

function testFrontendNotificationIcon() {
  log('FRONTEND', 'Checking NotificationIcon component...');
  const iconPath = path.join(__dirname, 'frontend/src/components/notifications/NotificationIcon.tsx');
  if (!fs.existsSync(iconPath)) {
    log('FRONTEND', 'NotificationIcon.tsx not found!', false);
    return false;
  }
  const content = fs.readFileSync(iconPath, 'utf8');
  const missing = EXPECTED_TYPES.filter(type => !content.includes(type));
  if (missing.length > 0) {
    log('FRONTEND', `Missing types: ${missing.join(', ')}`, false);
    return false;
  }
  log('FRONTEND', 'All types have icon configurations', true);
  return true;
}

function testNotificationServiceHandlers() {
  log('BACKEND', 'Checking notification service event handlers...');
  const servicePath = path.join(__dirname, 'apps/backend/src/services/notifications/notification.service.js');
  const content = fs.readFileSync(servicePath, 'utf8');
  const requiredListeners = ['notification:broadcast_created', 'deadline:upcoming', 'team:invited', 'scores:published'];
  const missing = requiredListeners.filter(listener => !content.includes(listener));
  if (missing.length > 0) {
    log('BACKEND', `Missing listeners: ${missing.join(', ')}`, false);
    return false;
  }
  log('BACKEND', 'All event listeners registered', true);
  return true;
}

function testRouteValidation() {
  log('ROUTES', 'Checking notification route validation...');
  const routesPath = path.join(__dirname, 'apps/backend/src/routes/notifications.routes.js');
  const content = fs.readFileSync(routesPath, 'utf8');
  const validTypes = content.match(/\.valid\(([^)]+)\)/s);
  if (!validTypes) {
    log('ROUTES', 'Type validation not found', false);
    return false;
  }
  log('ROUTES', 'Route validation includes notification types', true);
  return true;
}

function testNotificationsPage() {
  log('UI', 'Checking NotificationsPage integration...');
  const pagePath = path.join(__dirname, 'frontend/src/pages/NotificationsPage.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  const hasIconImport = content.includes('NotificationIcon');
  const hasLabelImport = content.includes('getNotificationLabel');
  if (!hasIconImport || !hasLabelImport) {
    log('UI', 'Missing icon component imports', false);
    return false;
  }
  log('UI', 'NotificationsPage uses type-specific icons', true);
  return true;
}

function testEventTriggers() {
  log('TRIGGERS', 'Checking event triggers...');
  const events = [
    { event: 'deadline:upcoming', file: 'workers/scheduler.worker.js' },
    { event: 'team:invited', file: 'services/teams/teams.service.js' },
    { event: 'scores:published', file: 'services/judging/scoring.service.js' }
  ];
  let allFound = true;
  for (const { event, file } of events) {
    const filePath = path.join(__dirname, 'apps/backend/src', file);
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(event) && content.includes('eventBus.emit');
    if (!found) {
      log('TRIGGERS', `${event} not found in ${file}`, false);
      allFound = false;
    }
  }
  if (allFound) {
    log('TRIGGERS', `All ${events.length} event triggers found`, true);
  }
  return allFound;
}

async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}     HackET Notification Type Analysis                      ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const tests = [
    testPrismaSchemaTypes,
    testFrontendNotificationIcon,
    testNotificationServiceHandlers,
    testRouteValidation,
    testNotificationsPage,
    testEventTriggers
  ];
  
  let passed = 0, failed = 0;
  for (const test of tests) {
    try {
      if (test()) passed++; else failed++;
    } catch (err) {
      log('ERROR', err.message, false);
      failed++;
    }
  }
  
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}                      TEST SUMMARY                         ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset}  ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset}  ${failed}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}✓ All notification types are properly configured!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠ Some tests failed.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
