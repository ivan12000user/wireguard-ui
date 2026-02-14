package handler

import (
"net/http"
"sort"
"time"

"github.com/labstack/echo/v4"
"github.com/ngoduykhanh/wireguard-ui/model"
"github.com/ngoduykhanh/wireguard-ui/store"
"golang.zx2c4.com/wireguard/wgctrl"
)

func StatusJSON(db store.IStore) echo.HandlerFunc {
type PeerJSON struct {
Name              string   `json:"name"`
AllocatedIPs      []string `json:"allocated_ips"`
Endpoint          string   `json:"endpoint"`
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

pk := devices[i].Peers[j].PublicKey.String()
lh := devices[i].Peers[j].LastHandshakeTime
connected := time.Since(lh).Minutes() < 3

p := PeerJSON{
Name:              pk,
AllocatedIPs:      allowed,
Endpoint:          endpoint,
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

sort.SliceStable(devOut.Peers, func(i, j int) bool { return devOut.Peers[i].Name < devOut.Peers[j].Name })
sort.SliceStable(devOut.Peers, func(i, j int) bool { return conv[devOut.Peers[i].Connected] > conv[devOut.Peers[j].Connected] })
out = append(out, devOut)
}

resp.Devices = out
return c.JSON(http.StatusOK, resp)
}
}
