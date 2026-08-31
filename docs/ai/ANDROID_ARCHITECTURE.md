# ClinicOS Android Architecture Memory

## Purpose

ClinicOS will eventually include a first-party Android application integrated directly with the ClinicOS platform.

The application must not be treated as an unrelated companion app.

It is a first-class ClinicOS client and may operate as:

- ClinicOS mobile client.
- Android Telephony Gateway.
- SMS Gateway.
- Realtime Voice Gateway.
- Device management endpoint.

## Priority

This architecture is a long-term requirement introduced from the beginning of the project.

The Android implementation itself is intentionally deferred until the core ClinicOS platform is sufficiently stable.

## Compatibility Goal

Support the broadest practical Android range.

Explicit design targets:

- Android 5.x where technically feasible.
- Android 6.x.
- Android 7.x.
- Android 8.x.
- Modern Android.

Do not hard-code the system around one Android version.

Use capability detection and adapter interfaces.

## Required Capabilities

Where Android/device/OEM permits:

- Incoming calls.
- Outgoing calls.
- Call state.
- Call history.
- SMS receive.
- SMS send.
- SMS synchronization.
- Microphone.
- Audio input/output.
- Bluetooth audio where applicable.
- Background connectivity.
- Realtime transport.
- Device heartbeat.
- Secure device registration.

## Permission Strategy

The application should request all permissions that are genuinely required for enabled gateway functionality, using the correct Android mechanism for each OS generation.

However:

- Permissions cannot be assumed.
- Some functionality requires runtime approval.
- Some functionality requires a system role.
- Some functionality may be restricted by Android/OEM.
- Some permissions are unavailable to ordinary third-party applications.

The application must report capability state to the backend.

## Default Applications

Where Android requires the app to be a default handler, enrollment must guide the user through the required system setting.

Relevant examples:

- Default Dialer.
- Default SMS application.

## Device Model

Each Android installation is a separately authenticated device.

Device data includes:

- device ID;
- tenant;
- branch;
- Android API level;
- Android version;
- manufacturer;
- model;
- app version;
- SIM/telephony state;
- permissions;
- capabilities;
- connectivity;
- health;
- last heartbeat.

## Realtime Voice

The long-term architecture is bidirectional realtime audio:

Phone call/device audio
→ Android Gateway
→ secure realtime transport
→ ClinicOS Voice Gateway
→ STT/AI/tools
→ TTS
→ secure realtime transport
→ Android Gateway
→ supported audio/call route.

This must be implemented as a realtime stream, not a sequence of uploaded audio files.

The final cellular call-audio implementation must be validated on actual target Android devices because third-party access to call audio is not universally available.

## Backend Contracts

The backend must expose stable contracts for:

- device enrollment;
- device authentication;
- device heartbeat;
- capability reporting;
- permission reporting;
- call events;
- SMS events;
- realtime voice sessions;
- audio stream negotiation;
- remote commands;
- device revocation.

## Security

Never trust the Android client.

Every request/event must be authenticated.

Every operation must resolve:

- tenant;
- branch;
- device;
- authorized user/service context.

Device credentials must be independently revocable.

## Offline

The Android Gateway must tolerate intermittent network connectivity.

Safe events may be queued locally and synchronized later.

Realtime voice must fail gracefully when connectivity is lost.

## Testing

Before production, test across:

- Android 5/6/7/8 where feasible.
- Modern Android.
- Multiple OEMs.
- Multiple SIM conditions.
- Incoming calls.
- Outgoing calls.
- SMS send/receive.
- Device reboot.
- Permission changes.
- Battery optimization.
- Background restrictions.
- Network loss/recovery.
- Realtime audio.
- Human handoff.

## Non-negotiable Architecture Rule

The core ClinicOS backend must never depend directly on Android APIs.

Android-specific behavior belongs behind adapters and gateway boundaries.
