import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  Activity,
  LayoutDashboard,
  FileSignature,
  Clock,
  Settings,
  AlertTriangle,
  Globe,
  Info,
  Minus,
  Maximize2,
  X,
  Copy,
  ShieldCheck,
  Menu
} from "lucide-react";

import { EventsOn, Quit, WindowHide, WindowMaximise, WindowMinimise, WindowUnmaximise } from "../../wailsjs/runtime/runtime";

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export function AppLayout({ children, activeRoute, onNavigate }: AppLayoutProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const unbindMaximize = EventsOn("wails:window:maximised", () => {
      setIsMaximized(true);
    });

    const unbindUnmaximize = EventsOn("wails:window:unmaximised", () => {
      setIsMaximized(false);
    });

    return () => {
      unbindMaximize();
      unbindUnmaximize();
    };
  }, []);

  const handleMaximizeToggle = () => {
    if (isMaximized) {
      if (window && (window as any).runtime) {
        (window as any).runtime.WindowUnmaximise();
      } else {
        WindowUnmaximise();
      }
      setIsMaximized(false);
    } else {
      if (window && (window as any).runtime) {
        (window as any).runtime.WindowMaximise();
      } else {
        WindowMaximise();
      }
      setIsMaximized(true);
    }
  };

  const menuGroups = [
    {
      title: "المتابعة",
      items: [
        { id: "live-connections", label: "الاتصالات الحية", icon: Activity },
        { id: "locations", label: "الموقع الجغرافي للاتصالات", icon: Clock },
      ]
    }
  ];

  return (
    <div className={cn(
      "flex h-screen w-full bg-[#10131a] text-[#e1e2ec] select-none",
      isMaximized && "cursor-default"
    )} dir="rtl">

      {/* Custom Window Header */}
      <div
        className={cn(
          "fixed right-0 left-0 h-8 bg-[#1d2027] border-b border-[#424754]/30 z-50 flex items-center justify-between px-3 wails-drag",
          isMaximized && "cursor-default"
        )}
        onDoubleClick={handleMaximizeToggle}
      >

        {/* Title Area */}
        <div className="flex items-center gap-2 h-full flex-1 pointer-events-none">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs select-none">
            HS
          </div>
          <h1 className="font-bold text-xs tracking-tight text-foreground select-none">حارس الشبكة</h1>
        </div>


        {/* Window Control Buttons */}
        <div className="flex items-center gap-1 wails-no-drag pointer-events-auto">
          <button
            onClick={() => WindowMinimise()}
            className="w-8 h-6 flex items-center justify-center bg-transparent transition-colors duration-150 hover:bg-[#32353c] active:scale-95 text-[#e1e2ec] cursor-pointer"
            title="تصغير"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleMaximizeToggle}
            className="w-8 h-6 flex items-center justify-center bg-transparent transition-colors duration-150 hover:bg-[#32353c] active:scale-95 text-[#e1e2ec] cursor-pointer"
            title={isMaximized ? "استعادة" : "تكبير"}
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => WindowHide()}
            className="w-8 h-6 flex items-center justify-center bg-transparent transition-colors duration-150 hover:bg-[#ef4444] hover:text-white active:scale-95 text-[#e1e2ec] cursor-pointer"
            title="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 bg-[#1d2027] border-l border-[#424754]/20 flex flex-col z-20 relative pt-8 shadow-lg">
        {/* Logo Section */}
        <div className="px-6 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#adc6ff]/20 flex items-center justify-center text-[#adc6ff]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#adc6ff]">حارس الشبكة</h1>
            <p className="text-[12px] text-[#c2c6d6]">مراقبة وأمان الشبكة</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <h3 className="text-[12px] font-semibold text-[#8c909f] mb-2 px-2 mt-4">{group.title}</h3>
              {group.items.map((item) => {
                const isItemActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200",
                      isItemActive
                        ? "bg-gradient-to-l from-[#adc6ff]/10 to-transparent border-r-4 border-[#adc6ff] text-[#adc6ff] font-bold"
                        : "text-[#c2c6d6] hover:text-[#e1e2ec] hover:bg-[#32353c]"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isItemActive ? "text-[#adc6ff]" : "text-[#8c909f]"
                    )} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 mt-auto border-t border-[#424754]/20">
          <button
            onClick={() => onNavigate("about")}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#c2c6d6] hover:text-[#e1e2ec] hover:bg-[#32353c] transition-all duration-200 w-full"
          >
            <Info className="h-5 w-5" />
            <span className="text-[12px]">حول التطبيق</span>
          </button>
          <div className="text-center text-[10px] text-[#8c909f] mt-2">v0.0.1</div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      {/* Main Workspace Canvas */}
      <main className="flex-1 w-full h-full bg-[#10131a] pt-8 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}