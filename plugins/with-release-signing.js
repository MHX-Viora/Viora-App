const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_SIGNING_MARKER = "MYAPP_UPLOAD_STORE_FILE";
const DEBUG_KEY_END = `            keyPassword 'android'
        }`;
const RELEASE_SIGNING_CONFIG = `
        release {
            if (!project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ||
                !project.hasProperty('MYAPP_UPLOAD_STORE_PASSWORD') ||
                !project.hasProperty('MYAPP_UPLOAD_KEY_ALIAS') ||
                !project.hasProperty('MYAPP_UPLOAD_KEY_PASSWORD')) {
                throw new org.gradle.api.GradleException('Missing MYAPP_UPLOAD_* release signing properties')
            }
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }`;

function applyReleaseSigning(contents) {
  if (contents.includes(RELEASE_SIGNING_MARKER)) return contents;

  if (!contents.includes(DEBUG_KEY_END)) {
    throw new Error("Unable to locate Android debug signing configuration");
  }

  const withReleaseConfig = contents.replace(
    DEBUG_KEY_END,
    `${DEBUG_KEY_END}${RELEASE_SIGNING_CONFIG}`,
  );
  const releaseBuildPattern =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;

  if (!releaseBuildPattern.test(withReleaseConfig)) {
    throw new Error("Unable to locate Android release build configuration");
  }

  return withReleaseConfig.replace(
    releaseBuildPattern,
    "$1signingConfig signingConfigs.release",
  );
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") {
      throw new Error("Release signing plugin requires build.gradle (Groovy)");
    }
    gradleConfig.modResults.contents = applyReleaseSigning(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
