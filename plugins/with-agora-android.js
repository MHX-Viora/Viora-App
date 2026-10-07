const { withProjectBuildGradle, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function withAgoraAndroid(config) {
  config = withProjectBuildGradle(config, (mod) => {
    const repository = "maven { url 'https://download.agora.io/maven/' }";
    if (!mod.modResults.contents.includes(repository)) {
      mod.modResults.contents += `\n// Agora RTC SDK repository\nallprojects { repositories { ${repository} } }\n`;
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const rulesPath = path.join(mod.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
    const rules = "-keep class io.agora.** { *; }\n-dontwarn io.agora.**\n";
    const existing = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf8") : "";
    if (!existing.includes("-keep class io.agora.**")) fs.writeFileSync(rulesPath, `${existing}\n${rules}`);
    return mod;
  }]);
};
