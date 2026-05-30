package process

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/oschwald/geoip2-golang"
)

// CountryConnection represents a country with active connections to it
type CountryConnection struct {
	CountryCode string   `json:"countryCode"` // ISO 3166-1 alpha-2 (e.g., "US")
	CountryName string   `json:"countryName"` // English name (e.g., "United States")
	Processes   []string `json:"processes"`   // List of process names connected to this country
	IPs         []string `json:"ips"`         // List of remote IPs in this country
	Count       int      `json:"count"`       // Total number of connections to this country
}

// NetworkConnectionsResponse wraps the backend response for the frontend
type NetworkConnectionsResponse struct {
	PublicIP            string              `json:"public_ip"`
	PublicIPCountryCode string              `json:"public_ip_country_code"`
	PublicIPCountryName string              `json:"public_ip_country_name"`
	Connections         []CountryConnection `json:"connections"`
}

func GetArabicCountryName(code string) string {
	data, err := os.ReadFile("country_codes.json")
	if err != nil {
		return code
	}

	var countries []struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}

	if err := json.Unmarshal(data, &countries); err != nil {
		return code
	}

	for _, country := range countries {
		if strings.EqualFold(country.Code, code) {
			return country.Name
		}
	}

	return ""
}

// isLocalIP returns true for loopback, private RFC1918, link-local, and unspecified addresses
func isLocalIP(ipStr string) bool {
	if ipStr == "" || ipStr == "0.0.0.0" || ipStr == "::" {
		return true
	}
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}
	return ip.IsLoopback() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() ||
		ip.IsPrivate()
}

// GetPublicIP queries Google DNS / Ipify for the actual internet-facing WAN IP address.
func GetPublicIP() (string, error) {
	providers := []string{
		"https://api.ipify.org",
		"https://ifconfig.me/ip",
		"https://icanhazip.com",
		"https://checkip.amazonaws.com",
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	var lastErr error

	for _, url := range providers {
		resp, err := client.Get(url)
		if err != nil {
			lastErr = err
			continue
		}

		body, readErr := func() ([]byte, error) {
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("status %d", resp.StatusCode)
			}

			return io.ReadAll(resp.Body)
		}()

		if readErr != nil {
			lastErr = fmt.Errorf("%s: %w", url, readErr)
			continue
		}

		publicIP := strings.TrimSpace(string(body))
		if publicIP == "" {
			lastErr = fmt.Errorf("%s returned empty response", url)
			continue
		}

		return publicIP, nil
	}

	return "", fmt.Errorf("all public IP providers failed: %w", lastErr)
}

// GetCountryConnections scans all active processes, resolves their external remote
// IPs to country names via the GeoLite2-Country database, and returns the aggregated data.
func (m *Manager) GetCountryConnections(dbPath string) (*NetworkConnectionsResponse, error) {
	// 1. Fetch public IP
	publicIP, err := GetPublicIP()
	if err != nil {
		log.Printf("[GEOIP] Failed to get public IP: %v", err)
		// Option: decide whether to fail completely, or just leave publicIP as "Unknown"
		// so the application still works offline or behind firewall restrictions.
		publicIP = "Unknown"
	}

	// 2. Open the MaxMind GeoLite2 database
	db, err := geoip2.Open(dbPath)
	if err != nil {
		log.Printf("[GEOIP] Failed to open GeoLite2 database at %q: %v", dbPath, err)
		return nil, err
	}
	defer db.Close()

	// getting the country from the ip
	var publicIPCountryCode string
	var publicIPCountryName string

	if publicIP != "" && publicIP != "Unknown" {
		ip := net.ParseIP(publicIP)

		if ip != nil {
			record, err := db.Country(ip)
			if err == nil {
				publicIPCountryCode = record.Country.IsoCode
				publicIPCountryName = record.Country.Names["en"]
				// publicIPCountryName = GetArabicCountryName(record.Country.IsoCode)

				if publicIPCountryName == "" {
					publicIPCountryName = publicIPCountryCode
				}
			}
		}
	}

	// 3. Fetch all active processes with their connection data
	processes, err := m.FetchActiveProcesses()
	if err != nil {
		return nil, err
	}

	type countryData struct {
		name      string
		processes map[string]struct{}
		ips       map[string]struct{}
		count     int
	}
	countryMap := make(map[string]*countryData)

	for _, proc := range processes {
		for _, conn := range proc.ConnectionsDetails {
			remoteIP := conn.RemoteIP
			if isLocalIP(remoteIP) {
				continue
			}

			ip := net.ParseIP(remoteIP)
			if ip == nil {
				continue
			}

			record, err := db.Country(ip)
			if err != nil || record.Country.IsoCode == "" {
				continue
			}

			code := record.Country.IsoCode
			// name := record.Country.Names["en"]
			name := GetArabicCountryName(record.Country.IsoCode)
			if name == "" {
				name = code
			}

			if _, exists := countryMap[code]; !exists {
				countryMap[code] = &countryData{
					name:      name,
					processes: make(map[string]struct{}),
					ips:       make(map[string]struct{}),
					count:     0,
				}
			}

			entry := countryMap[code]
			entry.count++
			entry.ips[remoteIP] = struct{}{}
			if proc.ProcessName != "" {
				entry.processes[proc.ProcessName] = struct{}{}
			}
		}
	}

	connectionsList := make([]CountryConnection, 0, len(countryMap))
	for code, data := range countryMap {
		procNames := make([]string, 0, len(data.processes))
		for p := range data.processes {
			procNames = append(procNames, p)
		}

		ipList := make([]string, 0, len(data.ips))
		for ip := range data.ips {
			ipList = append(ipList, ip)
		}

		connectionsList = append(connectionsList, CountryConnection{
			CountryCode: code,
			CountryName: data.name,
			Processes:   procNames,
			IPs:         ipList,
			Count:       data.count,
		})
	}

	// 4. Return the wrapped response payload
	return &NetworkConnectionsResponse{
		PublicIP:            publicIP,
		PublicIPCountryCode: publicIPCountryCode,
		PublicIPCountryName: publicIPCountryName,
		Connections:         connectionsList,
	}, nil
}
