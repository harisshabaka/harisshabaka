package main

import (
	"context"
	"fmt"
	"haris_shabaka/backend/process"
	"os/exec"
	"runtime"
)

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

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
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
// to country names using the bundled GeoLite2-Country.mmdb database.
// The database file is expected in the working directory (project root during dev,
// or alongside the binary in production).
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

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer.exe", "/select,", fullPath)
	case "darwin":
		cmd = exec.Command("open", "-R", fullPath)
	case "linux":
		cmd = exec.Command("dbus-send", "--session", "--print-reply", "--dest=org.freedesktop.FileManager1",
			"/org/freedesktop/FileManager1", "org.freedesktop.FileManager1.ShowItems",
			"array:string:file://"+fullPath, "string:")
	default:
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	return cmd.Run()
}