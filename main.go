package main

import (
	"embed"
	"fmt"
	"os"

	"github.com/allan-simon/go-singleinstance"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 1. SINGLE-INSTANCE PROTECTION
	// This prevents the user from launching "حارس الشبكة" multiple times simultaneously.
	lock, err := singleinstance.CreateLockFile("haris-al-shabaka-unique-lock-id.lock")
	if err != nil {
		fmt.Println("Another instance of حارس الشبكة is already running. Exiting...")
		os.Exit(0)
	}
	defer lock.Close()
	app := NewApp()

	err = wails.Run(&options.App{
		Title:     "حارس الشبكة",
		Width:     1124,
		Height:    640,
		MinWidth:  1124,
		MinHeight: 640,

		// KEEP THIS TRUE TO HIDE NATIVE HEADER
		Frameless:        true,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			// THIS IS THE FIX: This tells Wails to completely disable the native,
			// invisible frame overlay that causes the cursor resizing issue.
			DisableFramelessWindowDecorations: true,

			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
