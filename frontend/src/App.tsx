import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";

// Page components
import Dashboard from "@/pages/Dashboard";
import LiveConnections from "@/pages/LiveConnections";
import Processes from "@/pages/Processes";
import DNSActivity from "@/pages/DNSActivity";
import Alerts from "@/pages/Alerts";
import Logs from "@/pages/Logs";
import Statistics from "@/pages/Statistics";
import NotificationsSettings from "@/pages/NotificationsSettings";
import SecurityRules from "@/pages/SecurityRules";
import Appearance from "@/pages/Appearance";
import About from "@/pages/About";
import Locations from "@/pages/Locations";
import NetworkLogs from "@/pages/NetworkLogs";

export default function App() {
  const [activeRoute, setActiveRoute] = useState<string>("live-connections");

  const renderPage = () => {
    switch (activeRoute) {
      case "live-connections":
        return <LiveConnections />;
      case "processes":
        return <Processes />;
      case "dns-activity":
        return <DNSActivity />;
      case "alerts":
        return <Alerts />;
      case "logs":
        return <Logs />;
      case "statistics":
        return <Statistics />;
      case "notifications-settings":
        return <NotificationsSettings />;
      case "security-rules":
        return <SecurityRules />;
      case "appearance":
        return <Appearance />;
      case "about":
        return <About />;
      case "locations":
        return <Locations />;
      case "network-logs":
        return <NetworkLogs />;
      default:
        return <LiveConnections />;
    }
  };

  return (
    <AppLayout activeRoute={activeRoute} onNavigate={setActiveRoute}>
      {renderPage()}
    </AppLayout>
  );
}