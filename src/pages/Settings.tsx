import { User, Bell, Shield, Palette } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';

const settingsSections = [
  {
    id: 'profile',
    title: 'Profile Settings',
    icon: User,
    description: 'Manage your personal information and preferences',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Configure how and when you receive reminders',
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: Shield,
    description: 'Control your data and security settings',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel of your dashboard',
  },
];

export default function Settings() {
  return (
    <MainLayout>
      <div className="page-enter">
        <Header title="Settings" />

        <div className="max-w-2xl mx-auto">
          <div className="space-y-4">
            {settingsSections.map((section, index) => (
              <button
                key={section.id}
                className="w-full card-elevated p-6 text-left flex items-center gap-4 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
              </button>
            ))}
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
