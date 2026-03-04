/**
 * ColorVision Pro - Local Storage Manager
 * Handles persistent storage of sessions and settings using browser localStorage.
 */

const Storage = {
    /**
     * LocalStorage key names used by the application.
     * @type {Object.<string, string>}
     */
    keys: {
        sessions: 'colorvision_sessions',
        currentSession: 'colorvision_current_session',
        settings: 'colorvision_settings'
    },

    /**
     * Check if localStorage is available and writable.
     * @returns {boolean} True if localStorage can be used.
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
     * Retrieve all stored sessions.
     * @returns {Object[]} An array of session objects, newest first.
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
     * Persist an array of sessions to localStorage.
     * @param {Object[]} sessions - The sessions to store.
     * @returns {boolean} True on success, false on failure.
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
     * Create a new session object and store it as the current session.
     * @returns {Object} The newly created session.
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
     * Retrieve the current in-progress session.
     * @returns {Object|null} The current session, or null if none exists.
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
     * Store a session as the current in-progress session.
     * @param {Object} session - The session object to store.
     * @returns {boolean} True on success, false on failure.
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
     * Attach baseline test results to the current session.
     * @param {Object} results - Baseline test results.
     * @returns {Object|null} The updated session, or null if no current session exists.
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
     * Attach tuning results and best filter parameters to the current session.
     * @param {Object} results - Tuning results including bestParams.
     * @returns {Object|null} The updated session.
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
     * Attach validation results to the current session, mark it complete, and archive.
     * @param {Object} results - Validation test results.
     * @returns {Object|null} The updated session.
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
     * Archive the current session to the sessions list.
     * Updates an existing entry or prepends a new one, keeping at most 50 sessions.
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
     * Retrieve a session by its unique ID.
     * @param {string} sessionId - The session ID to look up.
     * @returns {Object|null} The matching session, or null if not found.
     */
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    },

    /**
     * Delete a session from the stored sessions list.
     * Also clears the current session if it matches.
     * @param {string} sessionId - The session ID to remove.
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
     * Retrieve application settings from localStorage.
     * @returns {Object} The stored settings, or defaults if none are saved.
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
     * Persist application settings to localStorage.
     * @param {Object} settings - The settings to save.
     * @returns {boolean} True on success, false on failure.
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
     * Return the default settings object.
     * @returns {Object} Default settings.
     */
    getDefaultSettings() {
        return {
            difficulty: 'medium',
            showTimer: true,
            soundEffects: false
        };
    },

    /**
     * Remove all application data from localStorage.
     * @returns {boolean} True on success, false on failure.
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
     * Return an overview of current storage usage.
     * @returns {Object} An object with session count, current session flag, and estimated byte size.
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
     * Format a byte count into a human-readable string.
     * @param {number} bytes - The number of bytes.
     * @returns {string} Formatted string (e.g. "1.5 KB").
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
