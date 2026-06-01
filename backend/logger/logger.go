package logger

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"haris_shabaka/backend/process"
	"math"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/glebarez/go-sqlite" // Pure Go SQLite driver
)

type Logger struct {
	db *sql.DB
}

// PaginatedLogsResponse represents the structured layout sent to the frontend grid
type PaginatedLogsResponse struct {
	Logs        []map[string]interface{} `json:"logs"`
	TotalRows   int                      `json:"totalRows"`
	TotalPages  int                      `json:"totalPages"`
	CurrentPage int                      `json:"currentPage"`
}

// NewLogger initializes the SQLite connection and sets up tables
func NewLogger(dbName string) (*Logger, error) {
	// Ensure the DB sits in the root path or executable base directory cleanly
	dbPath := filepath.Clean(dbName)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Create a robust table schema that logs structured parameters alongside raw JSON
	schema := `
	CREATE TABLE IF NOT EXISTS network_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		pid INTEGER,
		process_name TEXT,
		file_name TEXT,
		full_path TEXT,
		remote_ip TEXT,
		country TEXT,
		is_signed INTEGER,
		raw_json TEXT
	);`

	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return &Logger{db: db}, nil
}

// Close gracefully closes the database handle
func (l *Logger) Close() error {
	if l.db != nil {
		return l.db.Close()
	}
	return nil
}

// LogProcessActivity records process data to the SQLite database
func (l *Logger) LogProcessActivity(row process.ProcessRow, countryName string) error {
	// Convert the full ProcessRow structure into a raw JSON string for deep inspection later
	rawJSON, err := json.Marshal(row)
	if err != nil {
		return fmt.Errorf("failed to marshal raw process structure: %w", err)
	}

	query := `
	INSERT INTO network_logs (pid, process_name, file_name, full_path, remote_ip, country, is_signed, raw_json)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	isSignedInt := 0
	if row.IsSigned {
		isSignedInt = 1
	}

	_, err = l.db.Exec(query,
		row.PID,
		row.ProcessName,
		row.FileName,
		row.Path+row.FileName, // Combine directory path with base file name
		row.RemoteIP,
		countryName,
		isSignedInt,
		string(rawJSON),
	)

	if err != nil {
		fmt.Printf("[حارس الشبكة] Database Insertion Error: %v\n", err)
		return err
	}

	return nil
}

// GetLogByPID retrieves the complete logging history matching a live or dead PID
func (l *Logger) GetLogByPID(pid int) ([]map[string]interface{}, error) {
	query := `SELECT id, timestamp, process_name, full_path, remote_ip, country, is_signed, raw_json 
	          FROM network_logs WHERE pid = ? ORDER BY timestamp DESC;`

	rows, err := l.db.Query(query, pid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id int
		var timestamp, procName, fullPath, remoteIP, country, rawJSON string
		var isSigned int

		if err := rows.Scan(&id, &timestamp, &procName, &fullPath, &remoteIP, &country, &isSigned, &rawJSON); err != nil {
			return nil, err
		}

		results = append(results, map[string]interface{}{
			"id":           id,
			"timestamp":    timestamp,
			"process_name": procName,
			"full_path":    fullPath,
			"remote_ip":    remoteIP,
			"country":      country,
			"is_signed":    isSigned == 1,
			"raw_data":     rawJSON,
		})
	}

	return results, nil
}

// GetPaginatedLogs handles complex backend filtering, searching, and offset slicing
func (l *Logger) GetPaginatedLogs(page, pageSize int, searchFilter string) (PaginatedLogsResponse, error) {
	response := PaginatedLogsResponse{
		Logs:        []map[string]interface{}{},
		CurrentPage: page,
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	// Calculate SQL offset bounds
	offset := (page - 1) * pageSize

	// Base query construction strings
	baseCountQuery := "SELECT COUNT(*) FROM network_logs"
	baseSelectQuery := "SELECT id, timestamp, pid, process_name, file_name, full_path, remote_ip, country, is_signed, raw_json FROM network_logs"
	whereClause := ""
	var args []interface{}

	// If a search filter is typed in the frontend, search across key columns natively
	if searchFilter != "" {
		whereClause = " WHERE process_name LIKE ? OR remote_ip LIKE ? OR country LIKE ?"
		boundParam := "%" + searchFilter + "%"
		args = append(args, boundParam, boundParam, boundParam)
	}

	// 1. Fetch Total Count for metadata pagination boundaries
	var totalRows int
	err := l.db.QueryRow(baseCountQuery+whereClause, args...).Scan(&totalRows)
	if err != nil {
		return response, fmt.Errorf("failed to count logs: %w", err)
	}

	response.TotalRows = totalRows
	response.TotalPages = int(math.Ceil(float64(totalRows) / float64(pageSize)))

	// 2. Fetch the concrete sliced rows sorted from newest to oldest
	finalSelectQuery := baseSelectQuery + whereClause + " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	rows, err := l.db.Query(finalSelectQuery, args...)
	if err != nil {
		return response, fmt.Errorf("failed to select paginated records: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, pid, isSigned int
		var timestamp, procName, fileName, fullPath, remoteIP, country, rawJSON string

		err := rows.Scan(&id, &timestamp, &pid, &procName, &fileName, &fullPath, &remoteIP, &country, &isSigned, &rawJSON)
		if err != nil {
			return response, err
		}

		resultsRow := map[string]interface{}{
			"id":           id,
			"timestamp":    timestamp,
			"pid":          pid,
			"process_name": procName,
			"file_name":    fileName,
			"full_path":    fullPath,
			"remote_ip":    remoteIP,
			"country":      country,
			"is_signed":    isSigned == 1,
			"raw_data":     rawJSON,
		}
		response.Logs = append(response.Logs, resultsRow)
	}

	return response, nil
}

// GetDatabasePath dynamically detects the running context environment
func GetDatabasePath(appName string) string {
	exePath, err := os.Executable()
	if err != nil {
		// Safe baseline fallback if OS tracking fails
		return "logs_dev.db"
	}

	// Clean and lowercase the path string to avoid casing discrepancies
	normalizedPath := strings.ToLower(filepath.Clean(exePath))

	// If running via 'wails dev', the binary runs out of your project's build directory target
	if strings.Contains(normalizedPath, filepath.Join("build", "bin")) || strings.Contains(normalizedPath, "wailsjs") {
		// Development Mode: Use local relative storage
		return "logs_dev.db"
	}

	// Production Deployed Mode: Route directly to secure Windows AppData profiles
	appDataDir := os.Getenv("APPDATA")
	if appDataDir == "" {
		// Safe fallback layout if environment keys are missing
		appDataDir = os.Getenv("USERPROFILE")
	}

	targetDir := filepath.Join(appDataDir, appName)

	// Create the directory path natively if it doesn't exist yet
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		_ = os.MkdirAll(targetDir, 0755)
	}

	return filepath.Join(targetDir, "logs.db")
}
