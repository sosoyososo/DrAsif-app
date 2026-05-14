.PHONY: ios-list ios-dev

# List available iOS targets
ios-list:
	npx cap run ios --list

# Build, sync, and run (optionally target a specific device)
# Usage: make ios-dev                  → default device
#        make ios-dev TARGET=00008030  → specific target
ios-dev:
	npx vite build && npx cap sync ios && npx cap run ios $(if $(TARGET),--target $(TARGET),)
