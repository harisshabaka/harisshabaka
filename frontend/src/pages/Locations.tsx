import { useEffect, useRef, useState, useCallback } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { GetCountryConnections } from "../../wailsjs/go/main/App";
import { process } from "../../wailsjs/go/models";
import { Globe as GlobeIcon, RefreshCw, Wifi, AlertTriangle, X, Activity } from "lucide-react";
import countriesData from "../assets/countries.json";
import earthDark from "../assets/earth-dark.jpg";
import earthTopology from "../assets/earth-topology.png";
import { feature } from "topojson-client";
import topology from "../assets/countries-110m.json";

type GeoPolygon = any;

type CountryConnection = process.CountryConnection;

type CountryCoordinate = {
    country: string;
    latitude: number;
    longitude: number;
    name: string;
};
// Country ISO code → lat/lng centroid lookup (most common countries)
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> =
    (countriesData as CountryCoordinate[]).reduce(
        (acc, country) => {
            acc[country.country.toUpperCase()] = {
                lat: country.latitude,
                lng: country.longitude
            };
            return acc;
        },
        {} as Record<string, { lat: number; lng: number }>
    );

function getCountryCoords(code: string) {
    return COUNTRY_COORDS[code] ?? null;
}

// Generate a color based on connection count intensity
function getConnectionColor(count: number, maxCount: number, alpha = 1): string {
    const ratio = Math.min(count / Math.max(maxCount, 1), 1);
    if (ratio > 0.7) return `rgba(239, 68, 68, ${alpha})`;    // red - high traffic
    if (ratio > 0.4) return `rgba(251, 191, 36, ${alpha})`;   // amber - medium
    return `rgba(77, 142, 255, ${alpha})`;                    // blue - low
}

export default function Locations() {
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const [countries, setCountries] = useState<CountryConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CountryConnection | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });


    function useCountriesPolygons() {
        const [polygons, setPolygons] = useState<GeoPolygon[]>([]);

        useEffect(() => {
            const geo = feature(
                topology,
                topology.objects.countries
            );

            setPolygons((geo as any).features);
        }, []);

        return polygons;
    }

    const polygons = useCountriesPolygons();


    // Measure container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
        });
        ro.observe(el);
        setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
        return () => ro.disconnect();
    }, []);

    const [publicIp, setPublicIp] = useState("Unknown");
    const [sourceCountryCode, setSourceCountryCode] = useState("DE");
    const [sourceCountryName, setSourceCountryName] = useState("Unknown");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await GetCountryConnections();

            const fetchedConnections =
                response?.connections ?? [];

            const fetchedPublicIp =
                response?.public_ip ?? "Unknown";

            const fetchedPublicCountryCode =
                response?.public_ip_country_code ?? "DE";

            const fetchedPublicCountryName =
                response?.public_ip_country_name ?? "Unknown";

            console.log(fetchedPublicIp);

            setCountries(fetchedConnections);
            setPublicIp(fetchedPublicIp);

            setLastRefresh(new Date());
            console.log('the public ip is ', fetchedPublicIp);
            console.log('the public country code is ', fetchedPublicCountryCode);
            console.log('the public country name is ', fetchedPublicCountryName);
            setSourceCountryCode(fetchedPublicCountryCode);
            setSourceCountryName(fetchedPublicCountryName);

        } catch (err) {
            setError(
                "فشل في جلب بيانات الاتصالات"
            );

            console.error(
                "[Locations] Error:",
                err
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Configure globe camera on mount
    useEffect(() => {
        if (globeRef.current && countries.length > 0) {
            globeRef.current.pointOfView({ lat: 30, lng: 20, altitude: 2.2 }, 1200);
        }
    }, [countries]);

    const maxCount = Math.max(...countries.map((c) => c.count), 1);

    // Build arc data: one arc per country from a "home" point (0°, 0°) to each country
    // In a real app, you'd use the user's location — here we use a neutral origin
    const sourceCoords =
        getCountryCoords(sourceCountryCode) ??
        { lat: 51.17, lng: 10.45 };

    const arcData = countries
        .filter(
            (c) =>
                c.countryCode !== sourceCountryCode
        )
        .map((c) => {
            const coords = getCountryCoords(
                c.countryCode
            );

            if (!coords) return null;

            return {
                startLat: sourceCoords.lat,
                startLng: sourceCoords.lng,
                endLat: coords.lat,
                endLng: coords.lng,
                color: getConnectionColor(
                    c.count,
                    maxCount
                ),
                country: c
            };
        })
        .filter(Boolean) as {
            startLat: number;
            startLng: number;
            endLat: number;
            endLng: number;
            color: string;
            country: CountryConnection;
        }[];

    // Point data (glowing dots on each country)
    const pointData = countries
        .filter(
            (c) =>
                c.countryCode !== sourceCountryCode
        )
        .map((c) => {
            const coords = getCountryCoords(
                c.countryCode
            );

            if (!coords) return null;

            return {
                ...coords,
                country: c,
                count: c.count
            };
        })
        .filter(Boolean) as {
            lat: number;
            lng: number;
            country: CountryConnection;
            count: number;
        }[];

    const handlePointClick = (point: object) => {
        const p = point as { country: CountryConnection };
        setSelected(p.country);
        const coords = getCountryCoords(p.country.countryCode);
        if (coords && globeRef.current) {
            globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.8 }, 800);
        }
    };

    const totalConnections = countries.reduce((s, c) => s + c.count, 0);
    const uniqueProcesses = new Set(countries.flatMap((c) => c.processes ?? [])).size;



    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-[#10131a] relative">

            {/* ── Top Stats Bar ─────────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-[#424754]/30 bg-[#1d2027]/80 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center gap-2 text-[#adc6ff]">
                    <GlobeIcon className="h-4 w-4" />
                    <span className="text-[13px] font-semibold">خريطة الإتصالات</span>
                </div>
                <div className="h-4 w-px bg-[#424754]/50" />

                {/* Stats chips */}
                <StatChip label="الدول" value={countries.length} color="#adc6ff" />
                <StatChip label="عدد الإتصالات" value={totalConnections} color="#34d399" />
                <StatChip label="العمليات قيد المعالجة" value={uniqueProcesses} color="#fbbf24" />

                <div className="ml-auto flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-[11px] text-[#8c909f] font-mono-data">
                            {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-[12px] text-[#8c909f] hover:text-[#adc6ff] transition-colors bg-[#32353c] hover:bg-[#3a3d45] px-3 py-1.5 rounded-lg border border-[#424754]/50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        إعادة تحميل
                    </button>
                </div>
            </div>

            {/* ── Main Content ───────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Globe Canvas */}
                <div ref={containerRef} className="flex-1 relative overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#10131a]/80 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-[#adc6ff]/30 border-t-[#adc6ff] animate-spin" />
                                <p className="text-[#8c909f] text-[13px]">جاري البحث عن البرامج التي تستخدم الإنترنت…</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
                                <AlertTriangle className="h-10 w-10 text-[#fbbf24]" />
                                <p className="text-[#e1e2ec] text-[14px] font-semibold">تعذر تحميل البيانات</p>
                                <p className="text-[#8c909f] text-[12px]">{error}</p>
                                <button
                                    onClick={fetchData}
                                    className="mt-2 px-4 py-2 bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/30 rounded-lg text-[12px] hover:bg-[#adc6ff]/20 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && countries.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <Wifi className="h-10 w-10 text-[#8c909f]" />
                                <p className="text-[#e1e2ec] text-[14px] font-semibold">لم يتم العثور علي أي اتصال مع جهة خارجية</p>
                                <p className="text-[#8c909f] text-[12px]">كل العمليات النشطة حاليا تتستخدم إتصال شبكة محلي</p>
                            </div>
                        </div>
                    )}

                    {dimensions.width > 0 && (
                        <Globe
                            ref={globeRef}
                            width={dimensions.width}
                            height={dimensions.height}

                            // ── Atmosphere & Background ──────────────────────
                            backgroundColor="rgba(0,0,0,0)"
                            atmosphereColor="#3b5ea6"
                            atmosphereAltitude={0.18}
                            showAtmosphere={true}

                            // ── Globe Texture (dark map style) ───────────────
                            // globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                            // bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                            globeImageUrl={earthDark}
                            bumpImageUrl={earthTopology}
                            polygonsData={polygons}
                            polygonCapColor={() => "rgba(0,0,0,0)"}
                            polygonSideColor={() => "rgba(0,0,0,0)"}
                            polygonStrokeColor={() => "rgba(255,255,255,0.15)"}
                            polygonAltitude={0.01}
                            // ── Native 3D Marker for Source ───────────────────
                            labelsData={[{ lat: sourceCoords.lat, lng: sourceCoords.lng, text: `You are here ( ${sourceCountryName})` }]}
                            labelLat={(d) => (d as { lat: number }).lat}
                            labelLng={(d) => (d as { lng: number }).lng}
                            labelText={(d) => (d as { text: string }).text}
                            labelSize={1.5}
                            labelDotRadius={0.5}
                            labelColor={() => "#34d399"} // Bright green to stand out
                            labelResolution={2}
                            labelAltitude={0.01}

                            // ── Arcs (connection lines) ───────────────────────
                            arcsData={arcData}
                            arcStartLat={(d) => (d as typeof arcData[0]).startLat}
                            arcStartLng={(d) => (d as typeof arcData[0]).startLng}
                            arcEndLat={(d) => (d as typeof arcData[0]).endLat}
                            arcEndLng={(d) => (d as typeof arcData[0]).endLng}
                            arcColor={(d: object) => {
                                const arc = d as typeof arcData[0];
                                return [arc.color.replace("1)", "0.1)"), arc.color];
                            }}
                            arcDashLength={0.4}
                            arcDashGap={0.15}
                            arcDashAnimateTime={2800}
                            arcStroke={0.4}
                            arcAltitudeAutoScale={0.35}

                            // ── Points (country markers) ──────────────────────
                            pointsData={pointData}
                            pointLat={(d) => (d as typeof pointData[0]).lat}
                            pointLng={(d) => (d as typeof pointData[0]).lng}
                            pointColor={(d) => {
                                const p = d as typeof pointData[0];
                                return getConnectionColor(p.count, maxCount);
                            }}
                            pointRadius={(d) => {
                                const p = d as typeof pointData[0];
                                const base = 0.35;
                                const scale = Math.min((p.count / maxCount) * 0.9, 0.9);
                                return base + scale;
                            }}
                            pointAltitude={0.01}
                            pointsMerge={false}
                            onPointClick={handlePointClick}
                            pointLabel={(d) => {
                                const p = d as typeof pointData[0];
                                return `<div style="
                  background: rgba(13,17,26,0.95);
                  border: 1px solid rgba(173,198,255,0.3);
                  border-radius: 8px;
                  padding: 8px 12px;
                  font-family: 'Segoe UI', sans-serif;
                  font-size: 12px;
                  color: #e1e2ec;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                ">
                  <div style="font-weight:700;color:#adc6ff;margin-bottom:4px">${p.country.countryName}</div>
                  <div style="color:#8c909f">الإتصالات: ${p.count}</div>
                  <div style="color:#8c909f">${(p.country.processes ?? []).slice(0, 3).join(", ")}${(p.country.processes ?? []).length > 3 ? " +" + ((p.country.processes ?? []).length - 3) + " more" : ""}</div>
                </div>`;
                            }}

                            // ── Ring pulse on selected country ────────────────
                            ringsData={selected ? (() => {
                                const coords = getCountryCoords(selected.countryCode);
                                return coords ? [coords] : [];
                            })() : []}
                            ringLat={(d) => (d as { lat: number }).lat}
                            ringLng={(d) => (d as { lng: number }).lng}
                            ringColor={() => "#adc6ff"}
                            ringMaxRadius={4}
                            ringPropagationSpeed={3}
                            ringRepeatPeriod={700}

                            // ── Controls ──────────────────────────────────────
                            enablePointerInteraction={true}

                        // --------------------
                        />
                    )}

                    {/* Legend */}
                    <div className="absolute bottom-5 left-5 z-10 flex flex-col gap-1.5 bg-[#1d2027]/80 backdrop-blur-sm border border-[#424754]/40 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-[#8c909f] font-semibold uppercase tracking-wider mb-1">حجم الإتصالات</p>
                        <LegendItem color="#4d8eff" label="منخفض" />
                        <LegendItem color="#fbbf24" label="متوسط" />
                        <LegendItem color="#ef4444" label="مرتفع" />
                    </div>
                </div>

                {/* ── Right Sidebar: Country List / Detail ─────────────────── */}
                <aside className="w-[280px] shrink-0 flex flex-col border-l border-[#424754]/30 bg-[#1d2027]/60 backdrop-blur-sm overflow-hidden">
                    {selected ? (
                        /* Detail Panel */
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#424754]/30">
                                <span className="text-[13px] font-semibold text-[#e1e2ec]">{selected.countryName}</span>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="text-[#8c909f] hover:text-[#e1e2ec] transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Count */}
                                <div className="bg-[#10131a] rounded-xl p-4 border border-[#424754]/30 text-center">
                                    <div className="text-3xl font-bold text-[#adc6ff]">{selected.count}</div>
                                    <div className="text-[11px] text-[#8c909f] mt-1">الاتصالات النشطة حاليا</div>
                                </div>

                                {/* IPs */}
                                <div>
                                    <p className="text-[11px] text-[#8c909f] font-semibold uppercase tracking-wider mb-2"> عناوين الـIP</p>
                                    <div className="space-y-1">
                                        {(selected.ips ?? []).map((ip, i) => (
                                            <div key={i} className="font-mono-data text-[11px] text-[#c2c6d6] bg-[#10131a] px-2.5 py-1.5 rounded-lg border border-[#424754]/20">
                                                {ip}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Processes */}
                                <div>
                                    <p className="text-[11px] text-[#8c909f] font-semibold uppercase tracking-wider mb-2">العمليات قيد المعالجة</p>
                                    <div className="space-y-1">
                                        {(selected.processes ?? []).map((proc, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] text-[#e1e2ec] bg-[#10131a] px-2.5 py-1.5 rounded-lg border border-[#424754]/20">
                                                <Activity className="h-3 w-3 text-[#adc6ff] shrink-0" />
                                                <span className="truncate">{proc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Country List */
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-3 border-b border-[#424754]/30">
                                <p className="text-[12px] font-semibold text-[#e1e2ec]">الدول المتصل بها حاليا</p>
                                <p className="text-[11px] text-[#8c909f]">اضغط على الدولة للمزيد من التفاصيل</p>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {[...countries]
                                    .sort((a, b) => b.count - a.count)
                                    .map((c) => (
                                        <button
                                            key={c.countryCode}
                                            onClick={() => {
                                                setSelected(c);
                                                const coords = getCountryCoords(c.countryCode);
                                                if (coords && globeRef.current) {
                                                    globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.8 }, 800);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#adc6ff]/5 transition-colors border-b border-[#424754]/20 text-left"
                                        >
                                            {/* Flag emoji */}
                                            <span className="text-lg shrink-0">{countryCodeToFlag(c.countryCode)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-[#e1e2ec] truncate">{c.countryName}</div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm text-[#8c909f] font-mono-data">العمليات قيد المعالجة: {(c.processes ?? []).length}</div>
                                                    <div style={{ color: getConnectionColor(c.count, maxCount) }} className="text-[10px] text-[#8c909f] font-mono-data">عدد الإتصالات: {c.count}</div>

                                                </div>
                                            </div>

                                        </button>
                                    ))}
                                {countries.length === 0 && !loading && (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                                        <Wifi className="h-8 w-8 text-[#424754]" />
                                        <p className="text-[12px] text-[#8c909f]">لا يوجد إتصال مع أي جهة خارجية</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-2 bg-[#32353c]/60 px-3 py-1.5 rounded-lg border border-[#424754]/30">
            <span className="text-[11px] text-[#8c909f]">{label}</span>
            <span className="text-[13px] font-bold font-mono-data" style={{ color }}>{value}</span>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[11px] text-[#c2c6d6]">{label}</span>
        </div>
    );
}

// Converts ISO 3166-1 alpha-2 code to flag emoji
function countryCodeToFlag(code: string): string {
    if (!code || code.length !== 2) return "🌐";
    return code
        .toUpperCase()
        .split("")
        .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
        .join("");
}