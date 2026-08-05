const assert = require("node:assert/strict");
const test = require("node:test");

const { applyReleaseSigning } = require("./with-release-signing");

const generatedGradle = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
        }
    }
}`;

test("release builds use the configured upload keystore", () => {
  const result = applyReleaseSigning(generatedGradle);

  assert.match(result, /MYAPP_UPLOAD_STORE_FILE/);
  assert.match(
    result,
    /buildTypes \{[\s\S]*?release \{[\s\S]*?signingConfig signingConfigs\.release/,
  );
  assert.doesNotMatch(
    result,
    /buildTypes \{[\s\S]*?release \{[\s\S]*?signingConfig signingConfigs\.debug/,
  );
});

test("release signing patch is idempotent", () => {
  const once = applyReleaseSigning(generatedGradle);
  assert.equal(applyReleaseSigning(once), once);
});
