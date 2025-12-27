/**
 * ColorVision Pro - Export Module
 * Handles exporting session data as JSON and CSV
 */

const Export = {
    /**
     * Export session as JSON
     */
    exportJSON(session) {
        if (!session) {
            session = Storage.getCurrentSession();
        }

        if (!session) {
            console.error('No session to export');
            return null;
        }

        const exportData = this.prepareExportData(session);
        const json = JSON.stringify(exportData, null, 2);
        
        this.downloadFile(
            json,
            `colorvision-session-${session.id}.json`,
            'application/json'
        );

        return json;
    },

    /**
     * Export session as CSV
     */
    exportCSV(session) {
        if (!session) {
            session = Storage.getCurrentSession();
        }

        if (!session) {
            console.error('No session to export');
            return null;
        }

        const csv = this.generateCSV(session);
        
        this.downloadFile(
            csv,
            `colorvision-session-${session.id}.csv`,
            'text/csv'
        );

        return csv;
    },

    /**
     * Prepare export data structure
     */
    prepareExportData(session) {
        return {
            exportInfo: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                format: 'ColorVision Pro Session Export'
            },
            session: {
                id: session.id,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                completed: session.completed
            },
            deviceInfo: session.deviceInfo,
            baseline: session.baseline ? {
                timestamp: session.baseline.timestamp,
                overall: session.baseline.overall,
                deutan: session.baseline.deutan,
                control: session.baseline.control,
                timing: session.baseline.timing,
                severity: session.baseline.severity,
                plateCount: session.baseline.plateCount,
                responses: session.baseline.responses
            } : null,
            tuning: session.tuning ? {
                rounds: session.tuning.rounds,
                bestScore: session.tuning.bestScore,
                baselineScore: session.tuning.baselineScore,
                improvement: session.tuning.improvement,
                history: session.tuning.history
            } : null,
            validation: session.validation ? {
                timestamp: session.validation.timestamp,
                overall: session.validation.overall,
                deutan: session.validation.deutan,
                control: session.validation.control,
                timing: session.validation.timing,
                severity: session.validation.severity,
                responses: session.validation.responses
            } : null,
            filterParams: session.filterParams
        };
    },

    /**
     * Generate CSV from session
     */
    generateCSV(session) {
        const lines = [];

        // Session info header
        lines.push('# ColorVision Pro Session Export');
        lines.push(`# Session ID: ${session.id}`);
        lines.push(`# Created: ${session.createdAt}`);
        lines.push(`# Exported: ${new Date().toISOString()}`);
        lines.push('');

        // Device info
        if (session.deviceInfo) {
            lines.push('## Device Information');
            lines.push('Property,Value');
            Object.entries(session.deviceInfo).forEach(([key, value]) => {
                lines.push(`${this.escapeCSV(key)},${this.escapeCSV(String(value))}`);
            });
            lines.push('');
        }

        // Summary
        lines.push('## Results Summary');
        lines.push('Metric,Baseline,Post-Tune');
        
        const baselineScore = session.baseline?.overall?.score ?? 'N/A';
        const postTuneScore = session.validation?.overall?.score ?? 'N/A';
        lines.push(`Overall Score (%),${baselineScore},${postTuneScore}`);

        const baselineSeverity = session.baseline?.severity?.bucket ?? 'N/A';
        const postTuneSeverity = session.validation?.severity?.bucket ?? 'N/A';
        lines.push(`Severity,${baselineSeverity},${postTuneSeverity}`);

        const baselineDeutan = session.baseline?.deutan?.score ?? 'N/A';
        const postTuneDeutan = session.validation?.deutan?.score ?? 'N/A';
        lines.push(`Deutan Score (%),${baselineDeutan},${postTuneDeutan}`);

        const baselineControl = session.baseline?.control?.score ?? 'N/A';
        const postTuneControl = session.validation?.control?.score ?? 'N/A';
        lines.push(`Control Score (%),${baselineControl},${postTuneControl}`);
        lines.push('');

        // Filter parameters
        if (session.filterParams) {
            lines.push('## Filter Parameters');
            lines.push('Parameter,Value');
            Object.entries(session.filterParams).forEach(([key, value]) => {
                lines.push(`${this.escapeCSV(key)},${value}`);
            });
            lines.push('');
        }

        // Baseline responses
        if (session.baseline?.responses) {
            lines.push('## Baseline Test Responses');
            lines.push('Plate,Type,Target Type,Target Value,User Response,Correct,Response Time (ms)');
            session.baseline.responses.forEach((r, i) => {
                lines.push([
                    i + 1,
                    r.plateType,
                    r.targetType,
                    r.targetValue,
                    this.escapeCSV(r.userResponse),
                    r.isCorrect ? 'Yes' : 'No',
                    r.responseTime
                ].join(','));
            });
            lines.push('');
        }

        // Tuning history
        if (session.tuning?.history) {
            lines.push('## Tuning Rounds');
            lines.push('Round,Score (%),Hue Shift,Intensity,Saturation Boost');
            session.tuning.history.forEach(round => {
                lines.push([
                    round.round,
                    round.score,
                    round.params.hueShift,
                    round.params.intensity,
                    round.params.saturationBoost
                ].join(','));
            });
            lines.push('');
        }

        // Validation responses
        if (session.validation?.responses) {
            lines.push('## Validation Test Responses');
            lines.push('Plate,Type,Target Type,Target Value,User Response,Correct,Response Time (ms)');
            session.validation.responses.forEach((r, i) => {
                lines.push([
                    i + 1,
                    r.plateType,
                    r.targetType,
                    r.targetValue,
                    this.escapeCSV(r.userResponse),
                    r.isCorrect ? 'Yes' : 'No',
                    r.responseTime
                ].join(','));
            });
        }

        return lines.join('\n');
    },

    /**
     * Escape value for CSV
     */
    escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    },

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * Export all sessions as JSON
     */
    exportAllSessions() {
        const sessions = Storage.getSessions();
        
        if (sessions.length === 0) {
            console.error('No sessions to export');
            return null;
        }

        const exportData = {
            exportInfo: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                format: 'ColorVision Pro All Sessions Export'
            },
            sessionCount: sessions.length,
            sessions: sessions.map(s => this.prepareExportData(s))
        };

        const json = JSON.stringify(exportData, null, 2);
        
        this.downloadFile(
            json,
            `colorvision-all-sessions-${Date.now()}.json`,
            'application/json'
        );

        return json;
    },

    /**
     * Generate shareable summary text
     */
    generateSummary(session) {
        if (!session) {
            session = Storage.getCurrentSession();
        }

        if (!session) {
            return 'No session data available.';
        }

        let summary = '🎨 ColorVision Pro Results\n';
        summary += '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        if (session.baseline) {
            summary += '📊 Baseline Assessment:\n';
            summary += `   Overall Score: ${session.baseline.overall.score}%\n`;
            summary += `   Severity: ${session.baseline.severity.bucket.toUpperCase()}\n\n`;
        }

        if (session.validation && session.baseline) {
            const improvement = session.validation.overall.score - session.baseline.overall.score;
            summary += '✨ After Filter Tuning:\n';
            summary += `   New Score: ${session.validation.overall.score}%\n`;
            summary += `   Improvement: ${improvement > 0 ? '+' : ''}${improvement}%\n`;
            summary += `   New Severity: ${session.validation.severity.bucket.toUpperCase()}\n\n`;
        }

        if (session.filterParams) {
            summary += '🔧 Optimized Filter:\n';
            const display = ColorFilter.formatForDisplay(session.filterParams);
            Object.entries(display).forEach(([key, value]) => {
                summary += `   ${key}: ${value}\n`;
            });
        }

        summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        summary += '⚠️ This is not a medical diagnosis.\n';
        summary += 'Consult an eye care professional for clinical evaluation.';

        return summary;
    }
};

// Export for use in other modules
window.Export = Export;
