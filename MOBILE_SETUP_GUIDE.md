# Mobile-Only Setup & Operator Guide: Faceless Autopilot

Welcome to **Faceless Autopilot**. This system is specifically architected for an Android mobile phone user with **no laptop required**.

The entire video generation, script research, voiceover synthesis, and rendering engine runs 24/7 on the cloud backend. Your phone acts as the remote command dashboard.

---

## 1. Quick Mobile Installation (Under 60 Seconds)

You do not need to install Android Studio or compile code on a computer.

### Step 1: Open the App on Your Android Phone
Open your Chrome or Brave mobile browser on your Android device and visit the live app URL:
```
https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app
```

### Step 2: Install as a Native App
- A prompt button **"Install App"** will appear in the top header.
- Alternatively, tap the **Three Dots (⋮)** menu in Chrome and select **"Install app"** or **"Add to Home screen"**.
- Confirm **Install**.
- The **Faceless Autopilot** icon will appear on your phone's home screen and app drawer, launching fullscreen without browser address bars.

---

## 2. Daily Operations: What You Need To Do

### The Cloud Runs While Your Phone is Asleep
- **Target Monthly Quota**: 40 YouTube Shorts (vertical 9:16) + 20 Long-Form Videos (landscape 16:9).
- The cloud backend scheduler runs continuously. It evaluates topic virality, facts, scripts, voices, and rendering automatically.
- Your phone does **not** get hot or drain battery because zero heavy video rendering happens on your phone.

### Managing Autopilot from the Dashboard
1. **Home Screen**:
   - Check the **Quota Progress** (Shorts & Long videos produced this month).
   - Check the **Operating Budget** gauge (Tracks spending against the AED 500 ceiling).
   - Use the **Emergency STOP** button if you ever need to freeze all background production instantly.
2. **Videos Screen**:
   - Watch previews of generated videos.
   - Filter between **Shorts** and **Long-form**.
   - Tap **"Publish"** to send ready videos to YouTube.
3. **Autopilot Screen**:
   - Toggle individual content categories ON/OFF (AI tools, GitHub repos, Technology, Coding, Educational, Facts, Business, Science).
   - Change narrator voice (Kore, Puck, Fenrir, Zephyr, Guy).
   - Set upload safety mode (**Private** for initial tests, **Unlisted**, or **Public**).
4. **Settings Screen**:
   - Connect your YouTube channel via Google OAuth.
   - Run the **One-Tap Verification Test** to confirm all AI models, TTS, and video compositors are running at 100%.

---

## 3. Budget Protection (AED 500 Ceiling)

- **Hard Ceiling**: AED 500 (~$136 USD) per month.
- **Safety Warning**: If total monthly costs reach 80% (AED 400), the app displays an alert and prioritizes free/open-source tools.
- **Automatic Cutoff**: If costs reach 100% (AED 500), all paid operations are automatically paused to prevent unexpected charges.

---

## 4. Emergency Stop

A prominent red **Emergency STOP** button is located at the top of the Home Screen.
- Tapping it immediately halts all active pipeline rendering and pauses the background scheduler.
- No new videos will be generated or published until you tap **"Resume Operations"**.

---

## 5. Native Kotlin Android Codebase

If you or a developer ever want to build the native standalone APK file:
- The complete native Android project source code is available in the `/android` folder.
- Built with **Kotlin**, **Jetpack Compose**, and **Material 3**.
- Ready to compile with standard Gradle: `./gradlew assembleRelease`.
