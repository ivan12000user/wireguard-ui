package handler

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/ngoduykhanh/wireguard-ui/model"
	"github.com/ngoduykhanh/wireguard-ui/store"
	"golang.zx2c4.com/wireguard/wgctrl"
)

type peerGeoIPInfo struct {
	IP        string `json:"ip"`
	Provider  string `json:"provider"`
	Location  string `json:"location"`
	Source    string `json:"source"`
	Error     string `json:"error,omitempty"`
	UpdatedAt string `json:"updated_at"`
}

type peerGeoIPCacheFile struct {
	Version int                      `json:"version"`
	Entries map[string]peerGeoIPInfo `json:"entries"`
}

var peerGeoIPCache = struct {
	sync.Mutex
	Loaded  bool
	Entries map[string]peerGeoIPInfo
}{
	Entries: make(map[string]peerGeoIPInfo),
}

func StatusJSON(db store.IStore) echo.HandlerFunc {
	type PeerJSON struct {
		Name              string   `json:"name"`
		AllocatedIPs      []string `json:"allocated_ips"`
		Endpoint          string   `json:"endpoint"`
		Provider          string   `json:"provider"`
		Location          string   `json:"location"`
		GeoIP             string   `json:"geoip"`
		GeoIPSource       string   `json:"geoip_source"`
		ReceivedBytes     int64    `json:"received_bytes"`
		TransmitBytes     int64    `json:"transmit_bytes"`
		Connected         bool     `json:"connected"`
		LastHandshake     string   `json:"last_handshake"`
		LastHandshakeUnix int64    `json:"last_handshake_unix"`
	}

	type DeviceJSON struct {
		Name  string     `json:"name"`
		Peers []PeerJSON `json:"peers"`
	}

	type StatusJSONResponse struct {
		ServerTime string       `json:"server_time"`
		Error      string       `json:"error"`
		Devices    []DeviceJSON `json:"devices"`
	}

	return func(c echo.Context) error {
		c.Response().Header().Set(echo.HeaderCacheControl, "no-store")

		resp := StatusJSONResponse{
			ServerTime: time.Now().UTC().Format(time.RFC3339),
			Error:      "",
			Devices:    nil,
		}

		wgClient, err := wgctrl.New()
		if err != nil {
			resp.Error = err.Error()
			return c.JSON(http.StatusOK, resp)
		}
		defer wgClient.Close()

		devices, err := wgClient.Devices()
		if err != nil {
			resp.Error = err.Error()
			return c.JSON(http.StatusOK, resp)
		}

		meta := make(map[string]*model.Client)
		if clients, err := db.GetClients(false); err == nil {
			for i := range clients {
				if clients[i].Client != nil {
					meta[clients[i].Client.PublicKey] = clients[i].Client
				}
			}
		}

		conv := map[bool]int{true: 1, false: 0}
		out := make([]DeviceJSON, 0, len(devices))

		for i := range devices {
			devOut := DeviceJSON{Name: devices[i].Name, Peers: nil}

			for j := range devices[i].Peers {
				allowed := make([]string, 0, len(devices[i].Peers[j].AllowedIPs))
				for _, ip := range devices[i].Peers[j].AllowedIPs {
					allowed = append(allowed, ip.String())
				}

				endpoint := ""
				if devices[i].Peers[j].Endpoint != nil {
					endpoint = devices[i].Peers[j].Endpoint.String()
				}

				geo := lookupPeerGeoIP(endpoint)

				pk := devices[i].Peers[j].PublicKey.String()
				lh := devices[i].Peers[j].LastHandshakeTime
				connected := !lh.IsZero() && time.Since(lh).Minutes() < 3

				p := PeerJSON{
					Name:              pk,
					AllocatedIPs:      allowed,
					Endpoint:          endpoint,
					Provider:          geo.Provider,
					Location:          geo.Location,
					GeoIP:             geo.IP,
					GeoIPSource:       geo.Source,
					ReceivedBytes:     devices[i].Peers[j].ReceiveBytes,
					TransmitBytes:     devices[i].Peers[j].TransmitBytes,
					Connected:         connected,
					LastHandshake:     lh.Format(time.RFC3339),
					LastHandshakeUnix: lh.Unix(),
				}

				if cmeta, ok := meta[pk]; ok {
					p.Name = cmeta.Name
				}

				devOut.Peers = append(devOut.Peers, p)
			}

			sort.SliceStable(devOut.Peers, func(i, j int) bool {
				return devOut.Peers[i].Name < devOut.Peers[j].Name
			})
			sort.SliceStable(devOut.Peers, func(i, j int) bool {
				return conv[devOut.Peers[i].Connected] > conv[devOut.Peers[j].Connected]
			})

			out = append(out, devOut)
		}

		resp.Devices = out
		return c.JSON(http.StatusOK, resp)
	}
}

func lookupPeerGeoIP(endpoint string) peerGeoIPInfo {
	ip := endpointIP(endpoint)
	if ip == "" {
		return peerGeoIPInfo{}
	}

	if !geoIPEnabled() {
		return peerGeoIPInfo{IP: ip}
	}

	if !isPublicIP(ip) {
		return peerGeoIPInfo{IP: ip, Provider: "локальный/private", Location: "локальная сеть", Source: "local"}
	}

	cachePath := geoIPCachePath()
	ttl := geoIPTTL()

	peerGeoIPCache.Lock()
	defer peerGeoIPCache.Unlock()

	loadPeerGeoIPCacheLocked(cachePath)

	if cached, ok := peerGeoIPCache.Entries[ip]; ok {
		updatedAt, _ := time.Parse(time.RFC3339, cached.UpdatedAt)
		maxAge := ttl
		if cached.Error != "" {
			maxAge = time.Hour
		}
		if !updatedAt.IsZero() && time.Since(updatedAt) < maxAge {
			return cached
		}
	}

	info := fetchPeerGeoIP(ip)
	peerGeoIPCache.Entries[ip] = info
	savePeerGeoIPCacheLocked(cachePath)

	return info
}

func endpointIP(endpoint string) string {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return ""
	}

	host, _, err := net.SplitHostPort(endpoint)
	if err == nil {
		return strings.Trim(host, "[]")
	}

	if strings.HasPrefix(endpoint, "[") {
		if idx := strings.Index(endpoint, "]"); idx > 0 {
			return strings.Trim(endpoint[:idx+1], "[]")
		}
	}

	if strings.Count(endpoint, ":") == 1 {
		host, _, _ = strings.Cut(endpoint, ":")
		return host
	}

	return strings.Trim(endpoint, "[]")
}

func isPublicIP(ip string) bool {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return false
	}
	addr = addr.Unmap()

	if !addr.IsValid() ||
		addr.IsUnspecified() ||
		addr.IsLoopback() ||
		addr.IsPrivate() ||
		addr.IsLinkLocalUnicast() ||
		addr.IsLinkLocalMulticast() ||
		addr.IsMulticast() {
		return false
	}

	return true
}

func fetchPeerGeoIP(ip string) peerGeoIPInfo {
	now := time.Now().UTC().Format(time.RFC3339)
	info := peerGeoIPInfo{
		IP:        ip,
		Source:    "ipwho.is",
		UpdatedAt: now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1800*time.Millisecond)
	defer cancel()

	reqURL := "https://ipwho.is/" + url.PathEscape(ip)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		info.Error = err.Error()
		return info
	}
	req.Header.Set("User-Agent", "wireguard-ui-ivan-geoip/1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		info.Error = err.Error()
		return info
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		info.Error = "HTTP " + resp.Status
		return info
	}

	var r struct {
		Success    bool   `json:"success"`
		Message    string `json:"message"`
		Country    string `json:"country"`
		Region     string `json:"region"`
		City       string `json:"city"`
		ISP        string `json:"isp"`
		Org        string `json:"org"`
		Connection struct {
			ASN    int    `json:"asn"`
			ISP    string `json:"isp"`
			Org    string `json:"org"`
			Domain string `json:"domain"`
		} `json:"connection"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		info.Error = err.Error()
		return info
	}

	if !r.Success {
		if r.Message != "" {
			info.Error = r.Message
		} else {
			info.Error = "geoip lookup failed"
		}
		return info
	}

	provider := firstNonEmpty(r.Connection.ISP, r.Connection.Org, r.ISP, r.Org)
	if r.Connection.ASN > 0 {
		if provider != "" {
			provider = "AS" + strconv.Itoa(r.Connection.ASN) + " " + provider
		} else {
			provider = "AS" + strconv.Itoa(r.Connection.ASN)
		}
	}

	location := strings.Join(nonEmpty([]string{r.Country, r.Region, r.City}), ", ")

	info.Provider = provider
	info.Location = location

	return info
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v != "" {
			return v
		}
	}
	return ""
}

func nonEmpty(values []string) []string {
	out := make([]string, 0, len(values))
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func geoIPEnabled() bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv("WGUI_GEOIP_ENABLE")))
	return v == "" || v == "1" || v == "true" || v == "yes" || v == "on"
}

func geoIPCachePath() string {
	if v := strings.TrimSpace(os.Getenv("WGUI_GEOIP_CACHE_FILE")); v != "" {
		return v
	}
	return "/etc/wireguard/wgui-geoip-cache.json"
}

func geoIPTTL() time.Duration {
	v := strings.TrimSpace(os.Getenv("WGUI_GEOIP_CACHE_TTL_HOURS"))
	if v == "" {
		return 30 * 24 * time.Hour
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return 30 * 24 * time.Hour
	}
	return time.Duration(n) * time.Hour
}

func loadPeerGeoIPCacheLocked(path string) {
	if peerGeoIPCache.Loaded {
		return
	}
	peerGeoIPCache.Loaded = true

	b, err := os.ReadFile(path)
	if err != nil {
		return
	}

	var f peerGeoIPCacheFile
	if err := json.Unmarshal(b, &f); err != nil {
		return
	}

	if f.Entries != nil {
		peerGeoIPCache.Entries = f.Entries
	}
}

func savePeerGeoIPCacheLocked(path string) {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return
	}

	f := peerGeoIPCacheFile{
		Version: 1,
		Entries: peerGeoIPCache.Entries,
	}

	b, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return
	}

	_ = os.WriteFile(path, b, 0600)
}
