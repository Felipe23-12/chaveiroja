import { readFile } from 'node:fs/promises';

const files = {
  entitlements: 'ios/App/App/App.entitlements',
  info: 'ios/App/App/Info.plist',
  project: 'ios/App/App.xcodeproj/project.pbxproj',
  capacitor: 'capacitor.config.ts',
};

const [entitlements, info, project, capacitor] = await Promise.all(
  Object.values(files).map((file) => readFile(file, 'utf8')),
);

const failures = [];
const reject = (condition, message) => {
  if (condition) failures.push(message);
};

reject(entitlements.includes('com.apple.developer.calling-app'), 'calling-app entitlement is forbidden');
reject(entitlements.includes('com.apple.developer.carrier-messaging-app'), 'carrier messaging entitlement is forbidden');
reject(/<string>voip<\/string>/.test(info), 'voip background mode is forbidden');
reject(!info.includes('<string>remote-notification</string>'), 'remote-notification background mode is missing');
reject(!info.includes('NSLocationWhenInUseUsageDescription'), 'location usage description is missing');
reject(!project.includes('MARKETING_VERSION = 2.131675.3;'), 'marketing version must be 2.131675.3');
reject(!project.includes('CURRENT_PROJECT_VERSION = 3;'), 'build number must be 3');
reject(!project.includes('DEVELOPMENT_TEAM = TM2BBSKJ6L;'), 'Apple development team is missing');
reject(!project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;'), 'entitlements file is not assigned');
reject(!capacitor.includes('https://woodoo-quick-lock-link.base44.app'), 'published Base44 URL is missing');

if (failures.length) {
  console.error(`iOS configuration validation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('iOS configuration is valid: calling and VoIP capabilities are absent.');
