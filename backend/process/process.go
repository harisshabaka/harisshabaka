package process

// ConnectionInfo يمثل تفاصيل اتصال شبكة واحد
type ConnectionInfo struct {
	Protocol   string `json:"protocol"`
	LocalIP    string `json:"localIp"`
	LocalPort  uint32 `json:"localPort"`
	RemoteIP   string `json:"remoteIp"`
	RemotePort uint32 `json:"remotePort"`
	Status     string `json:"status"`
}

// ProcessRow يمثل هيكل البيانات التفصيلي لكل عملية أمنية
type ProcessRow struct {
	ID                 string           `json:"id"`
	Status             string           `json:"status"`
	FileName           string           `json:"fileName"`
	ProcessName        string           `json:"processName"`
	PID                int              `json:"pid"`
	Path               string           `json:"path"`
	NetworkKbps        string           `json:"networkKbps"`
	Signature          string           `json:"signature"`
	IsSigned           bool             `json:"isSigned"`
	RemoteIP           string           `json:"remoteIp"`
	Connections        int              `json:"connections"`
	SHA256             string           `json:"sha256"`
	Icon               string           `json:"icon"`
	NetworkType        string           `json:"networkType"`
	ParentProcessName  string           `json:"parentProcessName"`
	ParentPID          int              `json:"parentPid"`
	IsServer           bool             `json:"isServer"`
	ListenPorts        []uint32         `json:"listenPorts"`
	ConnectionsDetails []ConnectionInfo `json:"connectionsDetails"`
}

// Manager يدير عمليات جلب وفحص البيانات في الخلفية
type Manager struct{}

// NewManager ينشئ نسخة جديدة من مدير العمليات
func NewManager() *Manager {
	return &Manager{}
}

// FetchActiveProcesses يقوم بجلب مصفوفة العمليات النشطة (حالياً بيانات محاكية وفي تطبيقك الحقيقي ستستبدلها بقراءة من النظام)
// func (m *Manager) FetchActiveProcesses() ([]ProcessRow, error) {
// 	// البيانات المحاكية مطابقة تماماً للمصفوفة التي تحتاجها واجهة الـ React العربية
// 	mockData := []ProcessRow{
// 		{
// 			ID:          "1",
// 			Status:      "critical",
// 			FileName:    "updater.exe",
// 			ProcessName: "تحديث جوجل (مخفي)",
// 			PID:         2340,
// 			Path:        "C:\\Windows\\Temp\\",
// 			NetworkKbps: "158.4",
// 			Signature:   "غير موقّع / غير صالحة",
// 			IsSigned:    false,
// 			RemoteIP:    "185.220.101.5",
// 			Connections: 3,
// 			SHA256:      "2a2525667546626e35872770980422287285e32633099582",
// 		},
// 		{
// 			ID:          "2",
// 			Status:      "warning",
// 			FileName:    "svcHost_mod.exe",
// 			ProcessName: "برمجية نصية مجهولة",
// 			PID:         5410,
// 			Path:        "C:\\Windows\\System32\\",
// 			NetworkKbps: "2.8",
// 			Signature:   "غير موقّع / غير صالحة",
// 			IsSigned:    false,
// 			RemoteIP:    "91.198.174.192",
// 			Connections: 1,
// 			SHA256:      "f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
// 		},
// 		{
// 			ID:          "3",
// 			Status:      "safe",
// 			FileName:    "Chrome.exe",
// 			ProcessName: "جوجل كروم",
// 			PID:         1286,
// 			Path:        "C:\\Program Files\\",
// 			NetworkKbps: "0.6",
// 			Signature:   "موقّع بواسطة Google LLC",
// 			IsSigned:    true,
// 			RemoteIP:    "142.250.190.46",
// 			Connections: 14,
// 			SHA256:      "8b7c6d5e4f3a2b1c0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a",
// 		},
// 		{
// 			ID:          "4",
// 			Status:      "safe",
// 			FileName:    "lsass.exe",
// 			ProcessName: "سلطة الأمن المحلية",
// 			PID: 1556,
// 			Path: "C:\\Windows\\System32\\",
// 			NetworkKbps: "0.5",
// 			Signature: "موقّع بواسطة Microsoft Windows",
// 			IsSigned: true,
// 			RemoteIP: "127.0.0.1",
// 			Connections: 1,
// 			SHA256: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
// 		},
// 	}

// 	return mockData, nil
// }