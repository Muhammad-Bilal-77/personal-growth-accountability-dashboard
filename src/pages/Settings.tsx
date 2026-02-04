import { useEffect, useState } from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import { api } from '@/lib/api';
import ApiStatusBanner from '@/components/common/ApiStatusBanner';

const iconMap = {
  User,
  Bell,
  Shield,
  Palette,
} as const;

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof iconMap;
}

export default function Settings() {
  const [sections, setSections] = useState<SettingsSection[]>([]);
  const [error, setError] = useState<string | undefined>();

  const loadSections = async () => {
    try {
      const response = await api.get<{ data: SettingsSection[] }>("/api/settings/sections");
      setSections(response.data || []);
      setError(undefined);
    } catch (error) {
      console.error(error);
      setError('Unable to load settings from the backend.');
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Settings" />

        <ApiStatusBanner message={error} />

        <div className="max-w-2xl mx-auto">
          <div className="space-y-4">
            {sections.map((section, index) => {
              const Icon = iconMap[section.icon] ?? User;
              return (
              <button
                key={section.id}
                className="w-full card-elevated p-6 text-left flex items-center gap-4 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
              </button>
            );
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Growth Dashboard v1.0
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Built for personal accountability and spiritual growth
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
