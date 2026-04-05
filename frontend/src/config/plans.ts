// FILE: src/config/plans.ts
// PHOENIX PROTOCOL - CENTRALIZED PLAN CONFIGURATION

export type PlanTier = 'SOLO' | 'STARTUP' | 'GROWTH' | 'ENTERPRISE';

export interface PlanConfig {
    name: string;
    maxMembers: number;
    maxWorkspaces: number;
    maxStorageGB: number;
    features: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
    SOLO: {
        name: 'Solo',
        maxMembers: 1,
        maxWorkspaces: 1,
        maxStorageGB: 5,
        features: ['1 përdorues', '1 projekt', '5GB ruajtje']
    },
    STARTUP: {
        name: 'Startup',
        maxMembers: 5,
        maxWorkspaces: 3,
        maxStorageGB: 20,
        features: ['5 përdorues', '3 projekte', '20GB ruajtje', 'Mbështetje prioritare']
    },
    GROWTH: {
        name: 'Growth',
        maxMembers: 15,
        maxWorkspaces: 10,
        maxStorageGB: 100,
        features: ['15 përdorues', '10 projekte', '100GB ruajtje', 'API akses']
    },
    ENTERPRISE: {
        name: 'Enterprise',
        maxMembers: 999,
        maxWorkspaces: 999,
        maxStorageGB: 1000,
        features: ['Përdorues të pakufizuar', 'Projekte të pakufizuara', '1TB ruajtje', 'SLA 99.9%']
    }
};

export const getPlanLimits = (planTier: PlanTier | string): PlanConfig => {
    return PLAN_LIMITS[planTier as PlanTier] || PLAN_LIMITS.SOLO;
};

export const canInviteMoreMembers = (currentMemberCount: number, planTier: PlanTier | string): boolean => {
    const limits = getPlanLimits(planTier);
    return currentMemberCount < limits.maxMembers;
};

export const getRemainingMemberSlots = (currentMemberCount: number, planTier: PlanTier | string): number => {
    const limits = getPlanLimits(planTier);
    return Math.max(0, limits.maxMembers - currentMemberCount);
};