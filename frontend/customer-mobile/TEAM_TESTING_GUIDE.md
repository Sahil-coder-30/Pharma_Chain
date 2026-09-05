# MediaCare Consumer Mobile App — Team Testing & Setup Guide

This guide is for teammates who want to run and test the **MediaCare Consumer Mobile Application** against the PharmaChain backend running on their own laptops.

---

## Quick Overview

| Role | Runs On | Port |
| :--- | :--- | :--- |
| **Consumer Service API** | Teammate's Laptop | `3003` (or forwarded from K8s) |
| **API Gateway / Ingress** | Teammate's Laptop | `80` (or `8080` for Fabric backend) |
| **Mobile App (MediaCare)**| Physical Android Device / Emulator | Connects via USB (`adb reverse`) or Wi-Fi |

> [!IMPORTANT]
> **Do not route Consumer requests to port 8080.**  
> Port `8080` is reserved for the Hyperledger Fabric Java backend. The Consumer Service runs on port **`3003`**.

---

## Method 1: Running the Pre-Built APK (Simplest for Non-Mobile Devs)

Use this method if someone has sent you the `app-release.apk` or `app-debug.apk` file.

### Step 1: Install the APK on Your Android Device
1. Transfer the `.apk` file to your phone (via WhatsApp, Google Drive, Slack, or USB).
2. On your phone, tap the file to install it.
3. If prompted, allow **"Install from unknown sources"**.

### Step 2: Connect Phone to Your Laptop via USB Cable
1. Enable **Developer Options** on your phone:
   - Go to **Settings** > **About Phone**.
   - Tap **Build Number** 7 times until you see *"You are now a developer"*.
2. Enable **USB Debugging**:
   - Go to **Settings** > **System / Developer Options** > Turn on **USB Debugging**.
3. Plug your phone into your laptop with a USB cable (select **File Transfer / Android Auto** mode).

### Step 3: Set Up Port Forwarding
Ensure your PharmaChain backend is running, then open your laptop's terminal:

1. **Verify your phone is detected:**
   ```bash
   adb devices
   ```
   *(You should see your device serial number with `device` next to it).*

2. **Ensure the Consumer Service is forwarded to port 3003:**
   ```bash
   kubectl port-forward service/consumer-service 3003:80
   ```

3. **Bridge your laptop's port 3003 into your phone:**
   ```bash
   adb reverse tcp:3003 tcp:3003
   ```

### Step 4: Open the App
Launch **MediaCare** on your phone. The app will now communicate seamlessly with your laptop's local backend at `http://127.0.0.1:3003`!

---

## Method 2: Running Over Wi-Fi / Hotspot (No USB Cable)

Use this if you want to test completely wireless.

### Step 1: Put Phone & Laptop on the Same Network
* **Option A (Recommended):** Turn on **Mobile Hotspot** on your phone and connect your laptop to it.
* **Option B:** Connect both phone and laptop to the same home/office Wi-Fi.

### Step 2: Find Your Laptop's Local IP
In your laptop's terminal:
* **macOS:** `ipconfig getifaddr en0`
* **Linux:** `hostname -I | awk '{print $1}'`
* **Windows (PowerShell):** `(Get-NetIPAddress -InterfaceAlias 'Wi-Fi' -AddressFamily IPv4).IPAddress`

*(Example output: `192.168.43.15`)*

### Step 3: Run Port Forward with `--address 0.0.0.0`
By default, `kubectl port-forward` only listens to `localhost`. You must allow external incoming Wi-Fi connections:
```bash
kubectl port-forward --address 0.0.0.0 service/consumer-service 3003:80
```

### Step 4: Configure the App Base URL
In `frontend/customer-mobile/src/services/api/client.ts`, ensure candidate hosts include your laptop's IP:
```typescript
const hosts = [
  'http://<YOUR_LAPTOP_IP>:3003',
  'http://127.0.0.1:3003',
];
```

---

## Method 3: Running from Source Code (For Mobile Developers)

If you have pulled the repository and want to run live code with **Fast Refresh / Hot Reloading**:

### Prerequisites
* Node.js (v18+)
* Android Studio with Android SDK & Platform Tools (`adb`) installed

### Step 1: Install Dependencies
```bash
cd frontend/customer-mobile
npm install
```

### Step 2: Start the Backend & Port Forwarding
In terminal 1:
```bash
# Verify backend is running
kubectl get pods

# Forward consumer service
kubectl port-forward service/consumer-service 3003:80
```

### Step 3: Connect Device & Forward Ports
In terminal 2:
```bash
# Forward Metro bundler and backend ports to phone
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3003 tcp:3003
```

### Step 4: Launch the App
In terminal 3:
```bash
cd frontend/customer-mobile
npx expo run:android
```
Metro will build and install the development build onto your connected device. Saving any code will instantly hot-reload on your phone.

---

## Common Gotchas & Troubleshooting

### 1. `Google Sign-In error: [AxiosError: Request failed with status code 401]`
* **Cause:** The mobile app is trying to connect to port `8080` (Hyperledger Fabric) instead of port `3003` (Consumer Service).
* **Fix:** Verify in `src/services/api/client.ts` that `activeBaseHost` points to port `3003`. Check that `adb reverse tcp:3003 tcp:3003` was executed.

### 2. `Network Error` / `ECONNREFUSED`
* Run `adb reverse --list` in terminal. Ensure `tcp:3003 tcp:3003` is present.
* If testing over Wi-Fi, verify that your laptop firewall allows incoming connections on port `3003`, and that you used `--address 0.0.0.0` with `kubectl port-forward`.

### 3. Google Sign-In Fails with `DEVELOPER_ERROR` (Code 10)
* **Cause:** The SHA-1 certificate fingerprint of your Android keystore is not registered in Google Cloud Console for the OAuth 2.0 Client ID.
* **Fix:** When running the pre-built APK built by the team lead, this is already registered. If you build your own APK from scratch, add your local `debug.keystore` SHA-1 fingerprint to Google Cloud Console.

### 4. Viewing Real-Time App Logs
To see real-time `console.log` and authentication logs:
```bash
adb logcat -s ReactNativeJS:V
```
