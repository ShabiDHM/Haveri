// FILE: src/config/priorities.ts
// PHOENIX PROTOCOL - UNIFIED PRIORITY SYSTEM V1.0
// Three-tier priority: LOW, MEDIUM, CRITICAL

export interface PriorityConfig {
    label: string;
    color: string;           // Tailwind background color class
    dotColor: string;        // Tailwind color for the dot indicator
    borderColor: string;     // Tailwind border color class
}

export const PRIORITY_MAP: Record<string, PriorityConfig> = {
    LOW: {
        label: 'Ulët',
        color: 'bg-text-muted',
        dotColor: 'text-text-muted',
        borderColor: 'border-border-main'
    },
    MEDIUM: {
        label: 'Mesatar',
        color: 'bg-primary',
        dotColor: 'text-primary',
        borderColor: 'border-primary/30'
    },
    CRITICAL: {
        label: 'Kritik',
        color: 'bg-danger-start',
        dotColor: 'text-danger-start',
        borderColor: 'border-danger-start/30'
    }
};

// Helper function to safely get priority config
export const getPriorityConfig = (priority: string | undefined): PriorityConfig => {
    if (!priority) return PRIORITY_MAP.MEDIUM;
    const key = priority.toUpperCase();
    return PRIORITY_MAP[key] || PRIORITY_MAP.MEDIUM;
};

// List of valid priorities for dropdown menus
export const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Ulët' },
    { value: 'MEDIUM', label: 'Mesatar' },
    { value: 'CRITICAL', label: 'Kritik' }
];