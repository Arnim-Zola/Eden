/**
 * useOperationHistory.js
 * Persists Eden operation history to localStorage.
 * Deduplicates by id, caps at 50 entries, syncs across tabs.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eden:operations';
const MAX_ENTRIES = 50;

function readStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeStorage(ops) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
    } catch {
        // storage quota exceeded — silently ignore
    }
}

export function useOperationHistory() {
    const [operations, setOperations] = useState(readStorage);

    // Sync across tabs
    useEffect(() => {
        const handler = (e) => {
            if (e.key === STORAGE_KEY) {
                setOperations(readStorage());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const addOperation = useCallback((op) => {
        setOperations((prev) => {
            // Move to top if already exists (dedup), otherwise prepend
            const filtered = prev.filter((o) => o.id !== op.id);
            const next = [op, ...filtered].slice(0, MAX_ENTRIES);
            writeStorage(next);
            return next;
        });
    }, []);

    const updateOperation = useCallback((id, patch) => {
        setOperations((prev) => {
            const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
            writeStorage(next);
            return next;
        });
    }, []);

    const clearHistory = useCallback(() => {
        writeStorage([]);
        setOperations([]);
    }, []);

    return { operations, addOperation, updateOperation, clearHistory };
}
