package main

import (
	"context"
	_ "embed" // Don't forget this import for //go:embed
	"fmt"
	"haris_shabaka/backend/process"
	"os/exec"
	"time"

	goRuntime "runtime" // Alias native Go runtime to prevent conflicts

	"github.com/getlantern/systray"
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
	// 2. Set the tray icon using our embedded byte slice variable
	systray.SetIcon(iconData)
	systray.SetTitle("حارس الشبكة")
	systray.SetTooltip("حارس الشبكة - Active Monitoring")

	// Create menu items
	mOption1 := systray.AddMenuItem("Option 1", "Do something from Option 1")
	mOption2 := systray.AddMenuItem("Option 2", "Do something from Option 2")
	systray.AddSeparator()
	mExit := systray.AddMenuItem("Exit App", "Quit the entire application")

	// Monitor menu clicks in a loop
	for {
		select {
		case <-mOption1.ClickedCh:
			fmt.Println("Option 1 clicked!")
			// Fixed to use the explicit wailsRuntime
			wailsRuntime.WindowShow(a.ctx)

		case <-mOption2.ClickedCh:
			fmt.Println("Option 2 clicked!")

		case <-mExit.ClickedCh:
			fmt.Println("Exit clicked. Shutting down...")
			systray.Quit()
			return
		}
	}
}

func (a *App) onTrayExit() {
	if a.ctx != nil {
		// Fixed to use the explicit wailsRuntime
		wailsRuntime.Quit(a.ctx)
	}
}
