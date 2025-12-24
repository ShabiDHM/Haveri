// FILE: src/types/dailyBriefing.ts
// ... (previous interfaces) ...

export interface CalendarItem {
    title: string;
    time: string; // ISO String
    type: string;
    location: string;
    is_alert?: boolean; // <-- NEW OPTIONAL FIELD
}

// ... (rest of the file) ...