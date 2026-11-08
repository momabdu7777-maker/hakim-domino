#!/usr/bin/env bash
# يبني domino.apk موقّعاً من index.html و puzzle.html دون Gradle، بأدوات Android SDK مباشرة.
# الاستخدام: ./build.sh            (يقرأ الإصدار من VERSION_CODE / VERSION_NAME إن وُجدا)
set -euo pipefail
cd "$(dirname "$0")"

SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-35/android.jar"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-1.0}"
OUT="../domino.apk"
JAVAC="${JAVAC:-javac}"
command -v "$JAVAC" >/dev/null || { echo "javac not found: install a JDK (e.g. openjdk-21-jdk-headless) or set JAVAC=/path/to/javac" >&2; exit 1; }
[ -x "$BT/aapt2" ] && [ -f "$JAR" ] || { echo "Android SDK not found at $SDK" >&2; exit 1; }

rm -rf build && mkdir -p build/assets build/classes build/dex

echo "• أصول اللعبة والخطوط"
for page in ../index.html ../puzzle.html; do python3 -I tools/localize_fonts.py "$page" build/assets; done

echo "• الموارد"
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/base.apk -I "$JAR" --manifest AndroidManifest.xml -A build/assets \
  --min-sdk-version 24 --target-sdk-version 35 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" build/res.zip

echo "• الشيفرة"
"$JAVAC" -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$JAR" -classpath "$JAR" \
  -d build/classes src/com/hakim/domino/MainActivity.java
"$BT/d8" --release --min-api 24 --lib "$JAR" --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q ../base.apk classes.dex)

echo "• المحاذاة والتوقيع"
"$BT/zipalign" -f -p 4 build/base.apk build/aligned.apk
if [ ! -f keystore.properties ]; then
  PASS="$(head -c 18 /dev/urandom | base64 | tr -d '/+=')"
  keytool -genkeypair -keystore domino-release.jks -alias domino -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=Hakim Domino, O=Hakim, C=YE" >/dev/null 2>&1
  printf 'storeFile=domino-release.jks\nalias=domino\npassword=%s\n' "$PASS" > keystore.properties
  chmod 600 keystore.properties domino-release.jks
  echo "  أُنشئ مفتاح توقيع جديد: android/domino-release.jks (احتفظ به مع keystore.properties)"
fi
PASS="$(sed -n 's/^password=//p' keystore.properties)"
"$BT/apksigner" sign --v4-signing-enabled false --ks domino-release.jks --ks-key-alias domino --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out "$OUT" build/aligned.apk
"$BT/apksigner" verify "$OUT"
echo "✓ $(cd .. && pwd)/domino.apk  ($(du -h "$OUT" | cut -f1))"
