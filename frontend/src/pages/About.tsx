import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export default function About() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">

        <h1 className="text-xl font-bold text-[#e1e2ec]">
          حول التطبيق
        </h1>

        <p className="text-[#8c909f] text-sm">
          أداة لعرض وتحليل الاتصالات الشبكية بشكل تفاعلي
        </p>

        <div className="text-xs text-[#8c909f] space-y-1">
          <div>v0.0.1</div>
          <div>Go + Wails • React</div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-xs text-[#adc6ff] hover:text-[#e1e2ec]"
            >
              عرض التراخيص
            </Button>
          </DialogTrigger>

          <DialogContent
            showCloseButton={false}
            className="bg-[#1d2027] border-[#424754]/40 text-right text-[#e1e2ec] max-w-lg">

            <DialogHeader className="flex flex-row-reverse items-center justify-between text-right">
              <DialogTitle>
                التراخيص
              </DialogTitle>

              <DialogClose asChild>
                <button className="text-[#8c909f] hover:text-[#e1e2ec]">
                  ✕
                </button>
              </DialogClose>
            </DialogHeader>

            <ScrollArea dir="rtl" className="h-[400px] pr-4">
              <div className="space-y-4 text-xs text-[#8c909f]">

                <LicenseItem name="التطبيق" license="MIT" />
                <LicenseItem name="Go" license="BSD-style" />
                <LicenseItem name="Wails v2" license="MIT" />
                <LicenseItem name="GeoIP2" license="ISC" />
                <LicenseItem name="gopsutil" license="BSD-3-Clause" />
                <LicenseItem name="React" license="MIT" />
                <LicenseItem name="React DOM" license="MIT" />
                <LicenseItem name="react-globe.gl" license="MIT" />
                <LicenseItem name="Three.js" license="MIT" />
                <LicenseItem name="Vite" license="MIT" />
                <LicenseItem name="Tailwind CSS" license="MIT" />
                <LicenseItem name="lucide-react" license="ISC" />
                <LicenseItem name="Radix UI" license="MIT" />

              </div>
            </ScrollArea>

          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

function LicenseItem({
  name,
  license,
}: {
  name: string;
  license: string;
}) {
  return (
    <div dir="rtl" className="flex flex-col justify-between border-b border-[#424754]/20 py-2">
      <span className="text-[#e1e2ec]">{name}</span>
      <span className="text-[#8c909f]">{license}</span>
    </div>
  );
}