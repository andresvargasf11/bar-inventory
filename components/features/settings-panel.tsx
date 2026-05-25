'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, Check, X, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings, StorageLocation, CustomField } from '@/lib/types';
import { updateSettings } from '@/app/actions/settings';
import { createLocation, updateLocation, deleteLocation } from '@/app/actions/locations';
import { createCustomField, deleteCustomField } from '@/app/actions/products';
import { changePin } from '@/app/actions/auth';
import { resetInventoryData, resetAllData } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/modal';

interface Props {
  settings: AppSettings;
  locations: StorageLocation[];
  customFields: CustomField[];
}

export function SettingsPanel({ settings, locations, customFields }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [editingLocName, setEditingLocName] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'dropdown'>('text');
  const [confirmReset, setConfirmReset] = useState<'inventory' | 'all' | null>(null);
  const [changePinError, setChangePinError] = useState('');

  const handleSaveGeneral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateSettings(fd);
      toast.success('Settings saved');
      router.refresh();
    });
  };

  const handleAddLocation = () => {
    if (!newLocName.trim()) return;
    const fd = new FormData();
    fd.append('name', newLocName.trim());
    startTransition(async () => {
      const result = await createLocation(fd);
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Location "${newLocName}" added`);
      setNewLocName('');
      router.refresh();
    });
  };

  const handleUpdateLocation = (id: number) => {
    const fd = new FormData();
    fd.append('name', editingLocName.trim());
    startTransition(async () => {
      const result = await updateLocation(id, fd);
      if (result.error) { toast.error(result.error); return; }
      toast.success('Location updated');
      setEditingLocId(null);
      router.refresh();
    });
  };

  const handleDeleteLocation = (id: number, name: string) => {
    startTransition(async () => {
      const result = await deleteLocation(id);
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Location "${name}" deleted`);
      router.refresh();
    });
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    const fd = new FormData();
    fd.append('name', newFieldName.trim());
    fd.append('field_type', newFieldType);
    startTransition(async () => {
      const result = await createCustomField(fd);
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Custom field "${newFieldName}" added`);
      setNewFieldName('');
      router.refresh();
    });
  };

  const handleDeleteCustomField = (id: number, name: string) => {
    startTransition(async () => {
      await deleteCustomField(id);
      toast.success(`Field "${name}" deleted`);
      router.refresh();
    });
  };

  const handleChangePin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setChangePinError('');
    startTransition(async () => {
      const result = await changePin(fd);
      if (result.error) { setChangePinError(result.error); return; }
      toast.success('PIN changed successfully');
      (e.target as HTMLFormElement).reset();
    });
  };

  const handleReset = (type: 'inventory' | 'all') => {
    startTransition(async () => {
      if (type === 'inventory') await resetInventoryData();
      else await resetAllData();
      toast.success(type === 'inventory' ? 'Inventory data cleared' : 'All data reset');
      setConfirmReset(null);
      router.refresh();
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">Configure your bar inventory app</p>
      </div>

      {/* General Settings */}
      <section className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">General</h2>
        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Inactivity Lock Timeout (minutes)"
              name="inactivity_timeout"
              type="number"
              min="1"
              max="480"
              defaultValue={settings.inactivity_timeout ?? '30'}
            />
            <Input
              label="Inventory Reminder (days)"
              name="reminder_threshold"
              type="number"
              min="1"
              max="30"
              defaultValue={settings.reminder_threshold ?? '7'}
            />
          </div>
          <Input
            label="Default Unit of Measurement"
            name="default_unit"
            defaultValue={settings.default_unit ?? '750ml'}
            placeholder="e.g. 750ml"
          />
          <Input
            label="Default Categories (comma-separated)"
            name="default_categories"
            defaultValue={settings.default_categories ?? 'Spirits,Beer,Wine,Liqueur,Mixer'}
            placeholder="Spirits,Beer,Wine,Liqueur"
          />
          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>Save General Settings</Button>
          </div>
        </form>
      </section>

      {/* Storage Locations */}
      <section className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Storage Locations</h2>
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800">
              {editingLocId === loc.id ? (
                <>
                  <input
                    value={editingLocName}
                    onChange={(e) => setEditingLocName(e.target.value)}
                    className="flex-1 h-8 px-2 rounded bg-slate-700 border border-orange-500 text-sm text-white focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateLocation(loc.id)}
                    autoFocus
                  />
                  <button onClick={() => handleUpdateLocation(loc.id)} className="text-green-400 hover:text-green-300 p-1">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingLocId(null)} className="text-slate-400 hover:text-white p-1">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{loc.name}</span>
                  <button
                    onClick={() => { setEditingLocId(loc.id); setEditingLocName(loc.name); }}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                    className="text-slate-400 hover:text-red-400 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            placeholder="New location name…"
            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
            className="flex-1 h-9 px-3 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
          <Button size="sm" onClick={handleAddLocation} disabled={!newLocName.trim()}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </section>

      {/* Custom Fields */}
      <section className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Custom Product Fields</h2>
        <div className="space-y-2">
          {customFields.length === 0 && (
            <p className="text-sm text-slate-500">No custom fields yet.</p>
          )}
          {customFields.map((field) => (
            <div key={field.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800">
              <span className="flex-1 text-sm text-white">{field.name}</span>
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">{field.field_type}</span>
              <button
                onClick={() => handleDeleteCustomField(field.id, field.name)}
                className="text-slate-400 hover:text-red-400 p-1"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name…"
            className="flex-1 h-9 px-3 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as 'text' | 'number' | 'dropdown')}
            className="h-9 px-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="dropdown">Dropdown</option>
          </select>
          <Button size="sm" onClick={handleAddCustomField} disabled={!newFieldName.trim()}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </section>

      {/* Change PIN */}
      <section className="rounded-xl bg-slate-900 border border-slate-700/60 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Change PIN</h2>
        </div>
        <form onSubmit={handleChangePin} className="space-y-3">
          <Input label="Current PIN" name="current" type="password" inputMode="numeric" maxLength={6} />
          <Input label="New PIN (4–6 digits)" name="new" type="password" inputMode="numeric" maxLength={6} />
          <Input label="Confirm New PIN" name="confirm" type="password" inputMode="numeric" maxLength={6} />
          {changePinError && <p className="text-sm text-red-400">{changePinError}</p>}
          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>Change PIN</Button>
          </div>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl bg-slate-900 border border-red-900/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Danger Zone</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="destructive" size="sm" onClick={() => setConfirmReset('inventory')}>
            <RefreshCw size={14} /> Reset Inventory Data
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmReset('all')}>
            <Trash2 size={14} /> Reset All Data
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          &ldquo;Reset Inventory Data&rdquo; clears all counts and sessions. &ldquo;Reset All Data&rdquo; also removes all products, locations, and custom fields.
        </p>
      </section>

      <ConfirmDialog
        open={confirmReset === 'inventory'}
        onClose={() => setConfirmReset(null)}
        onConfirm={() => handleReset('inventory')}
        title="Reset Inventory Data"
        description="This will permanently delete all inventory counts and sessions. Products will remain. This cannot be undone."
        confirmLabel="Reset Inventory"
        loading={isPending}
      />
      <ConfirmDialog
        open={confirmReset === 'all'}
        onClose={() => setConfirmReset(null)}
        onConfirm={() => handleReset('all')}
        title="Reset All Data"
        description="This will permanently delete ALL data: products, inventory, locations, and custom fields. Your PIN will remain. This cannot be undone."
        confirmLabel="Reset Everything"
        loading={isPending}
      />
    </div>
  );
}
