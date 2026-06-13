import { useRef, useState } from "react";
import { actions, getSettings, useStore } from "@/lib/store";
import { useTheme } from "@/hooks/use-theme";
import { Download, Upload, RotateCcw, Moon, Sun, Bell, BellOff, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, toggle } = useTheme();
  const settings = useStore((s) => s.settings);
  const version = useStore((s) => s.version ?? 1);
  const notifEnabled = (settings?.notificationsEnabled ?? true) !== false;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  if (!open) return null;

  const flash = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const onExport = () => {
    const json = actions.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `LIFE_Backup_${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("ok", "Backup saved successfully");
  };

  const onImportClick = () => {
    setConfirmImport(true);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const res = actions.importData(text);
    e.target.value = "";
    if (res.ok) flash("ok", "Data restored successfully");
    else flash("err", res.error || "Import failed.");
    if (res.ok) setTimeout(() => window.location.reload(), 800);
  };

  const onReset = () => {
    setConfirmReset(true);
  };

  const doReset = () => {
    actions.resetAll();
    setConfirmReset(false);
    flash("ok", "All data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 800);
  };

  const toggleNotif = async () => {
    if (!notifEnabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    actions.setSettings({ ...getSettings(), notificationsEnabled: !notifEnabled });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 animate-fade-up" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center press">
            <X size={16} />
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${msg.kind === "ok" ? "bg-sage/20 text-foreground" : "bg-amber/20 text-foreground"}`}>
            {msg.text}
          </div>
        )}

        <Row
          icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          title="Theme"
          subtitle={theme === "dark" ? "Dark mode" : "Light mode"}
          actionLabel={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={toggle}
        />

        <Row
          icon={notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          title="Notifications"
          subtitle={notifEnabled ? "Reminders enabled" : "Reminders muted"}
          actionLabel={notifEnabled ? "Turn off" : "Turn on"}
          onClick={toggleNotif}
        />

        <Row
          icon={<Download size={18} />}
          title="Export Data"
          subtitle="Download your full LIFE backup as JSON"
          actionLabel="Export"
          onClick={onExport}
        />

        <Row
          icon={<Upload size={18} />}
          title="Import Data"
          subtitle="Restore from a previous backup file"
          actionLabel="Import"
          onClick={onImportClick}
        />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />

        <Row
          icon={<RotateCcw size={18} />}
          title="Reset All Data"
          subtitle="Start completely fresh"
          actionLabel="Reset"
          danger
          onClick={onReset}
        />

        <div className="mt-6 text-[11px] text-muted-foreground text-center">
          LIFE — State v{version}
        </div>
      </div>

      <AlertDialog open={confirmImport} onOpenChange={setConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data with the contents of your backup file. Make sure your backup is valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmImport(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmImport(false);
                setTimeout(() => fileRef.current?.click(), 0);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently erase all your data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmReset(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doReset}
              className="bg-amber/20 text-foreground hover:bg-amber/30"
            >
              Erase Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  icon, title, subtitle, actionLabel, onClick, danger,
}: { icon: React.ReactNode; title: string; subtitle: string; actionLabel: string; onClick: () => void; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[15px]">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs font-medium press shrink-0 ${danger ? "bg-amber/20 text-foreground" : "bg-sage/25 text-foreground"}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
