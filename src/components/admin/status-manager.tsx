'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import { INCIDENT_STATUS_LABELS, INCIDENT_SEVERITY_LABELS, MAINTENANCE_STATUS_LABELS } from '@/types';
import type {
  IncidentRecord,
  IncidentStatus,
  IncidentSeverity,
  MaintenanceWindowRecord,
  MaintenanceStatus,
  ServiceStatusRecord,
} from '@/types';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface SettingsData {
  platformStatus: string;
  services: ServiceStatusRecord[];
}

export function StatusManager({ initialSettings }: { initialSettings: SettingsData }) {
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [savingStatus, setSavingStatus] = useState(false);

  // Form insiden
  const [incidentModal, setIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    status: 'investigating' as IncidentStatus,
    severity: 'minor' as IncidentSeverity,
    affectedServices: '',
    startedAt: '',
    resolvedAt: '',
    updateMessage: '',
  });
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);

  // Form maintenance
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    status: 'scheduled' as MaintenanceStatus,
    affectedServices: '',
    startsAt: '',
    endsAt: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incidentsResponse, maintenanceResponse] = await Promise.all([
        fetch('/api/admin/cms/incidents', { cache: 'no-store' }),
        fetch('/api/admin/cms/maintenanceWindows', { cache: 'no-store' }),
      ]);
      const incidentsResult = (await incidentsResponse.json()) as { success: boolean; data?: IncidentRecord[] };
      const maintenanceResult = (await maintenanceResponse.json()) as { success: boolean; data?: MaintenanceWindowRecord[] };
      if (incidentsResult.success && incidentsResult.data) setIncidents(incidentsResult.data);
      if (maintenanceResult.success && maintenanceResult.data) setMaintenance(maintenanceResult.data);
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveIncident = useCallback(async () => {
    if (!incidentForm.title.trim()) {
      toast({ variant: 'error', title: 'Judul wajib diisi' });
      return;
    }
    setSaving(true);
    try {
      const existing = editingIncidentId ? incidents.find((i) => i.id === editingIncidentId) : null;
      const updates = existing ? [...existing.updates] : [];
      if (incidentForm.updateMessage.trim()) {
        updates.push({
          id: `${Date.now()}`,
          message: incidentForm.updateMessage.trim(),
          status: incidentForm.status,
          createdAt: new Date().toISOString(),
        });
      }
      const payload = {
        title: incidentForm.title.trim(),
        description: incidentForm.description.trim(),
        status: incidentForm.status,
        severity: incidentForm.severity,
        affectedServices: incidentForm.affectedServices
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        startedAt: incidentForm.startedAt ? new Date(incidentForm.startedAt).toISOString() : new Date().toISOString(),
        resolvedAt: incidentForm.resolvedAt ? new Date(incidentForm.resolvedAt).toISOString() : null,
        updates,
      };
      const url = editingIncidentId
        ? `/api/admin/cms/incidents/${editingIncidentId}`
        : '/api/admin/cms/incidents';
      const response = await fetch(url, {
        method: editingIncidentId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Insiden disimpan' });
        setIncidentModal(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [editingIncidentId, incidentForm, incidents, load, toast]);

  const saveMaintenance = useCallback(async () => {
    if (!maintenanceForm.title.trim() || !maintenanceForm.startsAt || !maintenanceForm.endsAt) {
      toast({ variant: 'error', title: 'Judul, mulai, dan selesai wajib diisi' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: maintenanceForm.title.trim(),
        description: maintenanceForm.description.trim(),
        status: maintenanceForm.status,
        affectedServices: maintenanceForm.affectedServices
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        startsAt: new Date(maintenanceForm.startsAt).toISOString(),
        endsAt: new Date(maintenanceForm.endsAt).toISOString(),
      };
      const response = await fetch('/api/admin/cms/maintenanceWindows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Jendela pemeliharaan disimpan' });
        setMaintenanceModal(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [load, maintenanceForm, toast]);

  const removeIncident = useCallback(
    async (incident: IncidentRecord) => {
      if (!window.confirm('Hapus insiden ini?')) return;
      try {
        await fetch(`/api/admin/cms/incidents/${incident.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        toast({ variant: 'success', title: 'Insiden dihapus' });
        await load();
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, toast],
  );

  const removeMaintenance = useCallback(
    async (maintenanceWindow: MaintenanceWindowRecord) => {
      if (!window.confirm('Hapus jendela pemeliharaan ini?')) return;
      try {
        await fetch(`/api/admin/cms/maintenanceWindows/${maintenanceWindow.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        toast({ variant: 'success', title: 'Dihapus' });
        await load();
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, toast],
  );

  const saveStatus = useCallback(async () => {
    setSavingStatus(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          platformStatus: settings.platformStatus,
          services: settings.services,
        }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Status layanan diperbarui' });
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSavingStatus(false);
    }
  }, [settings, toast]);

  const updateServiceStatus = useCallback(
    (name: string, status: ServiceStatusRecord['status']) => {
      setSettings((current) => ({
        ...current,
        services: current.services.map((s) => (s.name === name ? { ...s, status } : s)),
      }));
    },
    [],
  );

  const statusTab = (
    <div className="space-y-4">
      <Field label="Status Platform">
        <Select
          value={settings.platformStatus}
          onChange={(e) => setSettings((c) => ({ ...c, platformStatus: e.target.value }))}
          options={[
            { value: 'operational', label: 'Operasional' },
            { value: 'degraded', label: 'Gangguan Sebagian' },
            { value: 'outage', label: 'Gangguan Total' },
            { value: 'maintenance', label: 'Dalam Pemeliharaan' },
          ]}
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">Status per Layanan</p>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {settings.services.map((service) => (
            <li key={service.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{service.name}</p>
                <p className="truncate text-xs text-text-muted">{service.description}</p>
              </div>
              <Select
                value={service.status}
                onChange={(e) => updateServiceStatus(service.name, e.target.value as ServiceStatusRecord['status'])}
                options={[
                  { value: 'operational', label: 'Operasional' },
                  { value: 'degraded', label: 'Gangguan Sebagian' },
                  { value: 'outage', label: 'Gangguan Total' },
                  { value: 'maintenance', label: 'Pemeliharaan' },
                ]}
                aria-label={`Status ${service.name}`}
                className="h-8 w-auto py-0 text-xs"
              />
            </li>
          ))}
        </ul>
      </div>
      <Button onClick={() => void saveStatus()} loading={savingStatus}>
        Simpan Status Layanan
      </Button>
    </div>
  );

  const incidentsTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingIncidentId(null);
            setIncidentForm({
              title: '',
              description: '',
              status: 'investigating',
              severity: 'minor',
              affectedServices: '',
              startedAt: '',
              resolvedAt: '',
              updateMessage: '',
            });
            setIncidentModal(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Buat Insiden
        </Button>
      </div>
      {incidents.length === 0 ? (
        <EmptyState title="Belum ada insiden" description="Insiden yang dilaporkan akan tampil di halaman status publik." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {incidents.map((incident) => (
            <li key={incident.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{incident.title}</p>
                <div className="flex gap-2">
                  <Badge variant={incident.status === 'resolved' ? 'success' : 'warning'}>
                    {INCIDENT_STATUS_LABELS[incident.status]}
                  </Badge>
                  <Badge variant="neutral">{INCIDENT_SEVERITY_LABELS[incident.severity]}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {formatDateTime(incident.startedAt)} · {incident.updates.length} update
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingIncidentId(incident.id);
                    setIncidentForm({
                      title: incident.title,
                      description: incident.description,
                      status: incident.status,
                      severity: incident.severity,
                      affectedServices: incident.affectedServices.join(', '),
                      startedAt: incident.startedAt.slice(0, 16),
                      resolvedAt: incident.resolvedAt ? incident.resolvedAt.slice(0, 16) : '',
                      updateMessage: '',
                    });
                    setIncidentModal(true);
                  }}
                >
                  Edit / Tambah Update
                </Button>
                <button
                  type="button"
                  onClick={() => void removeIncident(incident)}
                  aria-label="Hapus insiden"
                  className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const maintenanceTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setMaintenanceForm({
              title: '',
              description: '',
              status: 'scheduled',
              affectedServices: '',
              startsAt: '',
              endsAt: '',
            });
            setMaintenanceModal(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Jadwalkan Pemeliharaan
        </Button>
      </div>
      {maintenance.length === 0 ? (
        <EmptyState title="Belum ada pemeliharaan terjadwal" description="Jendela pemeliharaan akan tampil di halaman status publik." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {maintenance.map((maintenanceWindow) => (
            <li key={maintenanceWindow.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{maintenanceWindow.title}</p>
                <p className="text-xs text-text-muted">
                  {formatDateTime(maintenanceWindow.startsAt)} — {formatDateTime(maintenanceWindow.endsAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{MAINTENANCE_STATUS_LABELS[maintenanceWindow.status]}</Badge>
                <button
                  type="button"
                  onClick={() => void removeMaintenance(maintenanceWindow)}
                  aria-label="Hapus jendela pemeliharaan"
                  className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (loading) return <LoadingState label="Memuat data…" />;

  return (
    <div>
      <Tabs
        items={[
          { key: 'status', label: 'Status Layanan', content: statusTab },
          { key: 'incidents', label: `Insiden (${incidents.length})`, content: incidentsTab },
          { key: 'maintenance', label: `Pemeliharaan (${maintenance.length})`, content: maintenanceTab },
        ]}
      />

      <Modal
        open={incidentModal}
        onClose={() => setIncidentModal(false)}
        title={editingIncidentId ? 'Edit Insiden' : 'Buat Insiden'}
        description="Insiden dan timeline-nya ditampilkan di halaman status publik."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Field label="Judul" required>
            <Input value={incidentForm.title} onChange={(e) => setIncidentForm((c) => ({ ...c, title: e.target.value }))} />
          </Field>
          <Field label="Deskripsi" required>
            <Textarea value={incidentForm.description} onChange={(e) => setIncidentForm((c) => ({ ...c, description: e.target.value }))} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select
                value={incidentForm.status}
                onChange={(e) => setIncidentForm((c) => ({ ...c, status: e.target.value as IncidentStatus }))}
                options={(['investigating', 'identified', 'monitoring', 'resolved'] as IncidentStatus[]).map((s) => ({
                  value: s,
                  label: INCIDENT_STATUS_LABELS[s],
                }))}
              />
            </Field>
            <Field label="Tingkat Keparahan">
              <Select
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm((c) => ({ ...c, severity: e.target.value as IncidentSeverity }))}
                options={(['none', 'minor', 'major', 'critical'] as IncidentSeverity[]).map((s) => ({
                  value: s,
                  label: INCIDENT_SEVERITY_LABELS[s],
                }))}
              />
            </Field>
            <Field label="Layanan Terdampak" hint="Pisahkan dengan koma.">
              <Input
                value={incidentForm.affectedServices}
                onChange={(e) => setIncidentForm((c) => ({ ...c, affectedServices: e.target.value }))}
                placeholder="Website & API, Sistem Pemesanan"
              />
            </Field>
            <Field label="Waktu Mulai">
              <Input
                type="datetime-local"
                value={incidentForm.startedAt}
                onChange={(e) => setIncidentForm((c) => ({ ...c, startedAt: e.target.value }))}
              />
            </Field>
            <Field label="Waktu Selesai" hint="Isi saat insiden resolved.">
              <Input
                type="datetime-local"
                value={incidentForm.resolvedAt}
                onChange={(e) => setIncidentForm((c) => ({ ...c, resolvedAt: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Update Baru" hint="Opsional — ditambahkan ke timeline insiden.">
            <Textarea
              value={incidentForm.updateMessage}
              onChange={(e) => setIncidentForm((c) => ({ ...c, updateMessage: e.target.value }))}
              rows={2}
              placeholder="Kami telah mengidentifikasi penyebab dan sedang memperbaiki."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIncidentModal(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveIncident()} loading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={maintenanceModal}
        onClose={() => setMaintenanceModal(false)}
        title="Jadwalkan Pemeliharaan"
        description="Pemeliharaan aktif ditampilkan di halaman status publik."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Field label="Judul" required>
            <Input value={maintenanceForm.title} onChange={(e) => setMaintenanceForm((c) => ({ ...c, title: e.target.value }))} />
          </Field>
          <Field label="Deskripsi" required>
            <Textarea value={maintenanceForm.description} onChange={(e) => setMaintenanceForm((c) => ({ ...c, description: e.target.value }))} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mulai" required>
              <Input
                type="datetime-local"
                value={maintenanceForm.startsAt}
                onChange={(e) => setMaintenanceForm((c) => ({ ...c, startsAt: e.target.value }))}
              />
            </Field>
            <Field label="Selesai" required>
              <Input
                type="datetime-local"
                value={maintenanceForm.endsAt}
                onChange={(e) => setMaintenanceForm((c) => ({ ...c, endsAt: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Layanan Terdampak" hint="Pisahkan dengan koma.">
            <Input
              value={maintenanceForm.affectedServices}
              onChange={(e) => setMaintenanceForm((c) => ({ ...c, affectedServices: e.target.value }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={maintenanceForm.status}
              onChange={(e) => setMaintenanceForm((c) => ({ ...c, status: e.target.value as MaintenanceStatus }))}
              options={(['scheduled', 'active', 'completed', 'cancelled'] as MaintenanceStatus[]).map((s) => ({
                value: s,
                label: MAINTENANCE_STATUS_LABELS[s],
              }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMaintenanceModal(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveMaintenance()} loading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
