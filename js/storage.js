/**
 * ColorVision Pro - Local Storage Manager
 * Handles persistent storage of sessions and settings
 */

const Storage = {
    /**
     * Storage keys
     */
    keys: {
        sessions: 'colorvision_sessions',
        currentSession: 'colorvision_current_session',
        settings: 'colorvision_settings'
    },

    /**
     * Check if storage is available
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get all stored sessions
     */
    getSessions() {
        try {
            const data = localStorage.getItem(this.keys.sessions);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading sessions:', e);
            return [];
        }
    },

    /**
     * Save sessions to storage
     */
    saveSessions(sessions) {
        try {
            localStorage.setItem(this.keys.sessions, JSON.stringify(sessions));
            return true;
        } catch (e) {
            console.error('Error saving sessions:', e);
            return false;
        }
    },

    /**
     * Create a new session
     */
    createSession() {
        const session = {
            id: Utils.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deviceInfo: Utils.getDeviceInfo(),
            baseline: null,
            tuning: null,
            validation: null,
            filterParams: null,
            completed: false
        };

        // Store as current session
        this.setCurrentSession(session);

        return session;
    },

    /**
     * Get current session
     */
    getCurrentSession() {
        try {
            const data = localStorage.getItem(this.keys.currentSession);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading current session:', e);
            return null;
        }
    },

    /**
     * Set current session
     */
    setCurrentSession(session) {
        try {
            session.updatedAt = new Date().toISOString();
            localStorage.setItem(this.keys.currentSession, JSON.stringify(session));
            return true;
        } catch (e) {
            console.error('Error saving current session:', e);
            return false;
        }
    },

    /**
     * Update current session with baseline results
     */
    saveBaselineResults(results) {
        const session = this.getCurrentSession();
        if (session) {
            session.baseline = results;
            this.setCurrentSession(session);
        }
        return session;
    },

    /**
     * Update current session with tuning results
     */
    saveTuningResults(results) {
        const session = this.getCurrentSession();
        if (session) {
            session.tuning = results;
            session.filterParams = results.bestParams;
            this.setCurrentSession(session);
        }
        return session;
    },

    /**
     * Update current session with validation results
     */
    saveValidationResults(results) {
        const session = this.getCurrentSession();
        if (session) {
            session.validation = results;
            session.completed = true;
            this.setCurrentSession(session);
            
            // Also save to sessions list
            this.archiveCurrentSession();
        }
        return session;
    },

    /**
     * Archive current session to sessions list
     */
    archiveCurrentSession() {
        const session = this.getCurrentSession();
        if (!session) return;

        const sessions = this.getSessions();
        
        // Check if session already exists (update) or is new (add)
        const existingIndex = sessions.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        } else {
            sessions.unshift(session); // Add to beginning
        }

        // Keep only last 50 sessions
        const trimmedSessions = sessions.slice(0, 50);
        this.saveSessions(trimmedSessions);
    },

    /**
     * Get a session by ID
     */
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    },

    /**
     * Delete a session
     */
    deleteSession(sessionId) {
        const sessions = this.getSessions();
        const filtered = sessions.filter(s => s.id !== sessionId);
        this.saveSessions(filtered);

        // Clear current if it matches
        const current = this.getCurrentSession();
        if (current && current.id === sessionId) {
            localStorage.removeItem(this.keys.currentSession);
        }
    },

    /**
     * Get settings
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.keys.settings);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (e) {
            return this.getDefaultSettings();
        }
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.keys.settings, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            difficulty: 'medium',
            showTimer: true,
            soundEffects: false
        };
    },

    /**
     * Clear all data
     */
    clearAll() {
        try {
            localStorage.removeItem(this.keys.sessions);
            localStorage.removeItem(this.keys.currentSession);
            localStorage.removeItem(this.keys.settings);
            return true;
        } catch (e) {
            console.error('Error clearing data:', e);
            return false;
        }
    },

    /**
     * Get storage usage info
     */
    getStorageInfo() {
        const sessions = this.getSessions();
        const currentSession = this.getCurrentSession();
        
        // Estimate size
        let totalSize = 0;
        Object.values(this.keys).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                totalSize += item.length * 2; // UTF-16 = 2 bytes per char
            }
        });

        return {
            sessionCount: sessions.length,
            hasCurrentSession: !!currentSession,
            estimatedSize: totalSize,
            estimatedSizeFormatted: this.formatBytes(totalSize)
        };
    },

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Export for use in other modules
window.Storage = Storage;
