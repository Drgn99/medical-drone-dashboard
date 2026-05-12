import Link from "next/link";
import { Plane, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEAM = [
  { name: "Suliman Bader Saud Al Salmi", role: "Bachelor's student, Engineering" },
  { name: "Ahmed Ali Al Balushi", role: "Bachelor's student, Engineering" },
  { name: "Ibrahim Zahir Al Sulaimani", role: "Bachelor's student, Engineering" },
];

const TECH_STACK = [
  "Next.js 16, TypeScript, Tailwind CSS, shadcn/ui",
  "Supabase (PostgreSQL + Auth + Realtime + Storage)",
  "Leaflet + OpenStreetMap",
  "Resend (transactional email)",
  "ArduPilot Copter on SpeedyBee F405 V5 flight controller",
  "Raspberry Pi 5 companion computer",
  "Python bridge with pymavlink",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ArrowLeft className="size-3" />
            Home
          </Link>
          <div className="flex items-center gap-3">
            <Plane className="size-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              Autonomous Medical Drone System
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        {/* Description */}
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-700">
            A capstone engineering project at the University of Technology and
            Applied Sciences (UTAS), Muscat. The system enables hospital staff
            to dispatch autonomous medical-supply drones to patients while
            providing real-time tracking and secure OTP-based delivery
            confirmation.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-muted-foreground">
            Bachelor&apos;s Phase A · Academic Year 2025–2026, Semester 2
          </div>
        </section>

        {/* What the system does */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What the System Does</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              <li>Hospital staff create delivery orders and assign drones via a web dashboard</li>
              <li>Drones fly autonomously to patient locations using ArduPilot waypoint navigation</li>
              <li>Real-time telemetry streams to the dashboard via Supabase Realtime</li>
              <li>Patients receive email notifications with a tracking link and OTP code</li>
              <li>Secure delivery confirmation: patients enter their OTP code on the public tracking page</li>
            </ul>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {TEAM.map((member) => (
                <div key={member.name} className="flex justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-900">{member.name}</span>
                  <span className="text-muted-foreground">{member.role}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between gap-4 text-sm">
                <span className="font-medium text-slate-900">Ms. Ann Mary Varghese</span>
                <span className="text-muted-foreground">Supervisor</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {TECH_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-xs text-muted-foreground">
          University of Technology and Applied Sciences (UTAS) · Muscat Campus
        </p>
      </footer>
    </div>
  );
}
