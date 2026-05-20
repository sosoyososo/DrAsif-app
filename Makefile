.PHONY: ios-list ios-dev android-list android-dev

# Android SDK configuration
export ANDROID_HOME := $(HOME)/Library/Android/sdk
export ANDROID_SDK_ROOT := $(HOME)/Library/Android/sdk
export JAVA_HOME := $(shell /usr/libexec/java_home -v 21 2>/dev/null)
export PATH := $(ANDROID_HOME)/platform-tools:$(ANDROID_HOME)/cmdline-tools/latest/bin:$(PATH)

# List available iOS targets
ios-list:
	npx cap run ios --list

# Build, sync, and run (optionally target a specific device)
# Usage: make ios-dev                  → default device
#        make ios-dev TARGET=00008030  → specific target
ios-dev:
	npx vite build && npx cap sync ios && npx cap run ios $(if $(TARGET),--target $(TARGET),)

# List available Android devices
android-list:
	npx cap run android --list

# Build, sync, and run Android on a connected device/emulator
android-dev:
	npx vite build && npx cap sync android && npx cap run android
