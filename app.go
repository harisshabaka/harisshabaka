package main

import (
	"context"
	_ "embed" // Don't forget this import for //go:embed
	"fmt"
	"haris_shabaka/backend/process"
	"os/exec"
	"time"

	goRuntime "runtime" // Alias native Go runtime to prevent conflicts

	"fyne.io/systray"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime" // Import Wails runtime
)

// 1. EMBED YOUR TRAY ICON HERE
// This reads the icon from your build directory at compile time and saves it into memory.
// Adjust the path if your icon filename is different (e.g., appicon.png or icon.ico)

//go:embed build/icon.ico
var iconData []byte

// App struct
type App struct {
	ctx            context.Context
	processManager *process.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		processManager: process.NewManager(),
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 1. Start your long-running background process
	go a.startBackgroundProcess()

	// 2. Start the System Tray in a separate goroutine
	go systray.Run(a.onTrayReady, a.onTrayExit)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetSystemProcesses returns the list of active processes with their network connections
func (a *App) GetSystemProcesses() []process.ProcessRow {
	data, err := a.processManager.FetchActiveProcesses()
	if err != nil {
		fmt.Printf("فشل في جلب العمليات: %v\n", err)
		return []process.ProcessRow{}
	}
	return data
}

// GetCountryConnections resolves external remote IPs from all active processes
func (a *App) GetCountryConnections() *process.NetworkConnectionsResponse {
	data, err := a.processManager.GetCountryConnections("GeoLite2-Country.mmdb")
	if err != nil {
		fmt.Printf("[GeoIP] Failed to get country connections: %v\n", err)
		return &process.NetworkConnectionsResponse{}
	}
	return data
}

// RevealInExplorer opens the OS file manager and highlights the specified file
func (a *App) RevealInExplorer(fullPath string) error {
	var cmd *exec.Cmd

	// Fixed to use the aliased goRuntime
	switch goRuntime.GOOS {
	case "windows":
		cmd = exec.Command("explorer.exe", "/select,", fullPath)
	case "darwin":
		cmd = exec.Command("open", "-R", fullPath)
	case "linux":
		cmd = exec.Command("dbus-send", "--session", "--print-reply", "--dest=org.freedesktop.FileManager1",
			"/org/freedesktop/FileManager1", "org.freedesktop.FileManager1.ShowItems",
			"array:string:file://"+fullPath, "string:")
	default:
		return fmt.Errorf("unsupported operating system: %s", goRuntime.GOOS)
	}

	return cmd.Run()
}

// --- Background Process ---
func (a *App) startBackgroundProcess() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-a.ctx.Done():
			fmt.Println("Background process stopping...")
			return
		case <-ticker.C:
			fmt.Println("Background task executing logic...")

			// Fixed to use the explicit wailsRuntime
			wailsRuntime.EventsEmit(a.ctx, "background-status", "Task ticked at "+time.Now().Format("15:04:05"))
		}
	}
}

// --- System Tray Logic ---
func (a *App) onTrayReady() {
	systray.SetIcon(iconData)
	systray.SetTitle("حارس الشبكة")
	systray.SetTooltip("حارس الشبكة - Active Monitoring")

	// Create menu items (These show natively on Right-Click automatically)
	mOption1 := systray.AddMenuItem("إظهار التطبيق", "إظهار نافذة التطبيق")
	systray.AddSeparator()
	mExit := systray.AddMenuItem("خروج", "خروج من التطبيق")

	// Tracking thresholds for double click behavior
	var lastClick time.Time
	doubleClickThreshold := 300 * time.Millisecond

	// --- THE ACTUAL FIXED CALLBACK: SetOnTapped ---
	systray.SetOnTapped(func() {
		now := time.Now()
		if now.Sub(lastClick) < doubleClickThreshold {
			fmt.Println("Double click detected! Showing window...")
			wailsRuntime.WindowShow(a.ctx)
			lastClick = time.Time{} // Reset
		} else {
			lastClick = now
			fmt.Println("Single click ignored.")
		}
	})

	// Monitor menu clicks in a loop (Right clicks natively drive this menu)
	for {
		select {
		case <-mOption1.ClickedCh:
			fmt.Println("Show app clicked from context menu!")
			wailsRuntime.WindowShow(a.ctx)

		case <-mExit.ClickedCh:
			selection, err := wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
				Type:          wailsRuntime.QuestionDialog,
				Title:         "تأكيد الخروج | Confirm Exit",
				Message:       "هل أنت متأكد من أنك تريد إغلاق حارس الشبكة تماماً؟\n\nAre you sure you want to completely close the app?",
				DefaultButton: "No",
				Buttons:       []string{"Yes", "No"},
			})

			if err != nil {
				fmt.Printf("خطأ في مربع الحوار: %v\n", err)
				systray.Quit()
				return
			}

			if selection == "Yes" {
				fmt.Println("Exit confirmed. Shutting down...")
				systray.Quit()
				return
			}
			fmt.Println("Exit canceled by user.")
		}
	}
}
func (a *App) onTrayExit() {
	if a.ctx != nil {
		// Fixed to use the explicit wailsRuntime
		wailsRuntime.Quit(a.ctx)
	}
}
