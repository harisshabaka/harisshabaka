package notifications

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-toast/toast"
)

type NotificationManager struct {
	appID    string
	assetDir string
}

func NewNotificationManager() *NotificationManager {
	exePath, err := os.Executable()

	var baseDir string
	if err != nil {
		fmt.Printf("[NOTIFY] os.Executable() failed: %v\n", err)
		baseDir = "."
	} else {
		fmt.Printf("[NOTIFY] Executable: %s\n", exePath)
		baseDir = filepath.Dir(exePath)
		fmt.Printf("[NOTIFY] BaseDir: %s\n", baseDir)
	}

	assetPath := filepath.Join(baseDir, "assets")

	if _, err := os.Stat(assetPath); os.IsNotExist(err) {
		fmt.Printf("[NOTIFY] Assets not found at: %s\n", assetPath)

		devPath := filepath.Join(baseDir, "..", "..", "assets")

		if _, devErr := os.Stat(devPath); devErr == nil {
			fmt.Printf("[NOTIFY] Using dev assets path: %s\n", devPath)
			assetPath = devPath
		} else {
			fmt.Printf("[NOTIFY] Dev assets path also missing: %s (%v)\n", devPath, devErr)
		}
	}

	fmt.Printf("[NOTIFY] Final assets path: %s\n", assetPath)

	return &NotificationManager{
		// You may later replace this with your own registered AppID.
		appID:    "Microsoft.Windows.Terminal",
		assetDir: assetPath,
	}
}

func (nm *NotificationManager) ShowDanger(title, message string) error {
	return nm.sendToast("🔴 "+title, message, "danger_red.png")
}

func (nm *NotificationManager) ShowWarning(title, message string) error {
	return nm.sendToast("🟡 "+title, message, "warning_yellow.png")
}

func (nm *NotificationManager) ShowSuggest(title, message string) error {
	return nm.sendToast("🟢 "+title, message, "suggest_green.png")
}

func (nm *NotificationManager) sendToast(title, message, iconName string) error {
	fmt.Println("===================================================")
	fmt.Printf("[NOTIFY] %s\n", time.Now().Format(time.RFC3339))
	fmt.Printf("[NOTIFY] Title: %s\n", title)
	fmt.Printf("[NOTIFY] Message: %s\n", message)

	rawIconPath := filepath.Join(nm.assetDir, iconName)

	fmt.Printf("[NOTIFY] Raw icon path: %s\n", rawIconPath)

	absIconPath, absErr := filepath.Abs(rawIconPath)
	if absErr != nil {
		fmt.Printf("[NOTIFY] filepath.Abs error: %v\n", absErr)
	} else {
		fmt.Printf("[NOTIFY] Absolute icon path: %s\n", absIconPath)
	}

	if stat, err := os.Stat(rawIconPath); err != nil {
		fmt.Printf("[NOTIFY] Icon file NOT FOUND: %v\n", err)
	} else {
		fmt.Printf("[NOTIFY] Icon exists. Size=%d bytes\n", stat.Size())
	}

	cleanIconPath := filepath.ToSlash(rawIconPath)
	cleanIconPath = strings.ReplaceAll(cleanIconPath, "//", "/")

	fmt.Printf("[NOTIFY] Clean icon path: %s\n", cleanIconPath)
	fmt.Printf("[NOTIFY] AppID: %s\n", nm.appID)

	notification := toast.Notification{
		AppID:   nm.appID,
		Title:   title,
		Message: message,
		Icon:    cleanIconPath,
		Audio:   toast.Default,
	}

	fmt.Println("[NOTIFY] Calling notification.Push() ...")

	err := notification.Push()

	if err != nil {
		fmt.Printf("[NOTIFY] PUSH FAILED: %T : %v\n", err, err)
		return err
	}

	fmt.Println("[NOTIFY] PUSH SUCCEEDED")
	fmt.Println("===================================================")

	return nil
}
