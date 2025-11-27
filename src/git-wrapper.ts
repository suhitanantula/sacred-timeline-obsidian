/**
 * Sacred Timeline - Git Wrapper for Obsidian
 *
 * Translates human-friendly innovation language to git commands.
 *
 * The Language:
 *   capture     → git add . && git commit -m "message"
 *   update      → git pull
 *   backup      → git push
 *   changes     → git diff + git status
 *   timeline    → git log (visual)
 *   experiment  → git checkout -b "name"
 *   keep        → git merge
 *   discard     → git branch -d
 *   restore     → git checkout
 *   start       → git init
 *   connect     → git remote add origin
 *   narrate     → summarize recent activity
 */

import simpleGit, { SimpleGit } from 'simple-git';

export interface CaptureResult {
    success: boolean;
    message: string;
    hash?: string;
}

export interface UpdateResult {
    success: boolean;
    message: string;
    behind?: number;
    ahead?: number;
}

export interface BackupResult {
    success: boolean;
    message: string;
    pushed?: boolean;
}

export interface ChangesResult {
    hasChanges: boolean;
    staged: string[];
    unstaged: string[];
    untracked: string[];
    summary: string;
}

export interface TimelineEntry {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: Date;
    relativeDate: string;
}

export interface ExperimentResult {
    success: boolean;
    message: string;
    experimentName?: string;
}

export interface NarrateResult {
    success: boolean;
    summary: string;
    stats: {
        totalCaptures: number;
        activeDays: number;
        topFiles: { file: string; path: string; changes: number }[];
        busiestDay: { day: string; captures: number } | null;
    };
}

export interface StatusSummary {
    isRepo: boolean;
    currentExperiment: string | null;
    hasChanges: boolean;
    aheadOfCloud: number;
    behindCloud: number;
    hasConflicts: boolean;
}

export class SacredTimeline {
    private git: SimpleGit;
    private vaultPath: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.git = simpleGit(vaultPath);
    }

    /**
     * CAPTURE: Save this moment
     */
    async capture(message: string): Promise<CaptureResult> {
        try {
            const status = await this.git.status();

            if (status.files.length === 0) {
                return {
                    success: false,
                    message: 'Nothing to capture - no changes detected'
                };
            }

            await this.git.add('.');
            const result = await this.git.commit(message);

            return {
                success: true,
                message: `Captured: "${message}"`,
                hash: result.commit
            };
        } catch (error) {
            return {
                success: false,
                message: `Capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * UPDATE: Get latest from cloud
     */
    async update(): Promise<UpdateResult> {
        try {
            const remotes = await this.git.getRemotes(true);

            if (remotes.length === 0) {
                return {
                    success: false,
                    message: 'Not connected to cloud yet. Use "Connect" first.'
                };
            }

            await this.git.fetch();
            const status = await this.git.status();

            if (status.behind === 0) {
                return {
                    success: true,
                    message: 'Already up to date!',
                    behind: 0,
                    ahead: status.ahead
                };
            }

            await this.git.pull();

            return {
                success: true,
                message: `Updated! Got ${status.behind} new capture(s) from cloud.`,
                behind: status.behind,
                ahead: status.ahead
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (errorMsg.includes('conflict')) {
                return {
                    success: false,
                    message: 'Update found tangles (conflicts). Resolve them manually.'
                };
            }

            return {
                success: false,
                message: `Update failed: ${errorMsg}`
            };
        }
    }

    /**
     * BACKUP: Send to cloud
     */
    async backup(): Promise<BackupResult> {
        try {
            const remotes = await this.git.getRemotes(true);

            if (remotes.length === 0) {
                return {
                    success: false,
                    message: 'Not connected to cloud yet. Use "Connect" first.'
                };
            }

            const status = await this.git.status();

            if (status.ahead === 0) {
                return {
                    success: true,
                    message: 'Already backed up! Cloud is in sync.',
                    pushed: false
                };
            }

            await this.git.push();

            return {
                success: true,
                message: `Backed up! ${status.ahead} capture(s) sent to cloud.`,
                pushed: true
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (errorMsg.includes('rejected')) {
                return {
                    success: false,
                    message: 'Backup rejected - cloud has newer changes. Run "Update" first.'
                };
            }

            return {
                success: false,
                message: `Backup failed: ${errorMsg}`
            };
        }
    }

    /**
     * CHANGES: What did I change?
     */
    async changes(): Promise<ChangesResult> {
        try {
            const status = await this.git.status();

            const staged = status.staged;
            const unstaged = status.modified.filter(f => !status.staged.includes(f));
            const untracked = status.not_added;

            const hasChanges = staged.length > 0 || unstaged.length > 0 || untracked.length > 0;

            let summary = '';
            if (!hasChanges) {
                summary = 'No changes since last capture.';
            } else {
                const parts = [];
                if (staged.length > 0) parts.push(`${staged.length} ready to capture`);
                if (unstaged.length > 0) parts.push(`${unstaged.length} modified`);
                if (untracked.length > 0) parts.push(`${untracked.length} new`);
                summary = parts.join(', ');
            }

            return {
                hasChanges,
                staged,
                unstaged,
                untracked,
                summary
            };
        } catch (error) {
            return {
                hasChanges: false,
                staged: [],
                unstaged: [],
                untracked: [],
                summary: `Could not check changes: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * TIMELINE: Show me history
     */
    async timeline(limit: number = 20): Promise<TimelineEntry[]> {
        try {
            const log = await this.git.log({ maxCount: limit });

            return log.all.map(entry => ({
                hash: entry.hash,
                shortHash: entry.hash.substring(0, 7),
                message: entry.message,
                author: entry.author_name,
                date: new Date(entry.date),
                relativeDate: this.getRelativeDate(new Date(entry.date))
            }));
        } catch {
            return [];
        }
    }

    /**
     * EXPERIMENT: Try something risky
     */
    async experiment(name: string): Promise<ExperimentResult> {
        try {
            const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            await this.git.checkoutLocalBranch(safeName);

            return {
                success: true,
                message: `Experiment "${name}" started. You're now on a safe branch.`,
                experimentName: safeName
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not start experiment: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * KEEP: Keep the experiment
     */
    async keep(): Promise<{ success: boolean; message: string }> {
        try {
            const status = await this.git.status();
            const currentBranch = status.current;

            if (currentBranch === 'main' || currentBranch === 'master') {
                return {
                    success: false,
                    message: 'You\'re already on the main timeline. Nothing to keep.'
                };
            }

            const mainBranch = await this.getMainBranch();
            await this.git.checkout(mainBranch);
            await this.git.merge([currentBranch!]);
            await this.git.deleteLocalBranch(currentBranch!);

            return {
                success: true,
                message: `Experiment "${currentBranch}" is now part of the main timeline!`
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (errorMsg.includes('conflict')) {
                return {
                    success: false,
                    message: 'Keeping this experiment created tangles. Resolve conflicts manually.'
                };
            }

            return {
                success: false,
                message: `Could not keep experiment: ${errorMsg}`
            };
        }
    }

    /**
     * DISCARD: Abandon experiment
     */
    async discard(): Promise<{ success: boolean; message: string }> {
        try {
            const status = await this.git.status();
            const currentBranch = status.current;

            if (currentBranch === 'main' || currentBranch === 'master') {
                return {
                    success: false,
                    message: 'You\'re on the main timeline. Nothing to discard.'
                };
            }

            const mainBranch = await this.getMainBranch();
            await this.git.checkout(mainBranch);
            await this.git.deleteLocalBranch(currentBranch!, true);

            return {
                success: true,
                message: `Experiment "${currentBranch}" discarded. Back on main timeline.`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not discard experiment: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * RESTORE: Go back to earlier
     */
    async restore(hashOrRelative: string): Promise<{ success: boolean; message: string }> {
        try {
            const status = await this.git.status();
            if (status.files.length > 0) {
                return {
                    success: false,
                    message: 'You have unsaved changes. Capture them first, or they\'ll be lost.'
                };
            }

            await this.git.checkout(hashOrRelative);

            return {
                success: true,
                message: `Restored to capture ${hashOrRelative.substring(0, 7)}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not restore: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * START: Begin fresh project
     */
    async start(): Promise<{ success: boolean; message: string }> {
        try {
            await this.git.init();

            return {
                success: true,
                message: 'Sacred Timeline initialized! Your innovation journey begins.'
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not start: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * CONNECT: Link to cloud
     */
    async connect(url: string): Promise<{ success: boolean; message: string }> {
        try {
            await this.git.addRemote('origin', url);

            return {
                success: true,
                message: 'Connected to cloud! You can now backup and update.'
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (errorMsg.includes('already exists')) {
                return {
                    success: false,
                    message: 'Already connected to cloud.'
                };
            }

            return {
                success: false,
                message: `Could not connect: ${errorMsg}`
            };
        }
    }

    /**
     * NARRATE: Summarize progress in plain English
     */
    async narrate(days: number = 7): Promise<NarrateResult> {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);
            const sinceStr = since.toISOString().split('T')[0];

            const log = await this.git.log({ '--since': sinceStr });
            const commits = log.all;

            if (commits.length === 0) {
                return {
                    success: true,
                    summary: `No captures in the last ${days} days. Time to get back to work!`,
                    stats: {
                        totalCaptures: 0,
                        activeDays: 0,
                        topFiles: [],
                        busiestDay: null
                    }
                };
            }

            const dayMap: { [key: string]: number } = {};
            const fileChanges: { [key: string]: number } = {};

            for (const commit of commits) {
                const day = new Date(commit.date).toLocaleDateString('en-US', { weekday: 'long' });
                dayMap[day] = (dayMap[day] || 0) + 1;

                try {
                    const diff = await this.git.diff([`${commit.hash}^`, commit.hash, '--name-only']);
                    const files = diff.split('\n').filter(f => f.trim());
                    files.forEach(file => {
                        fileChanges[file] = (fileChanges[file] || 0) + 1;
                    });
                } catch {
                    // First commit won't have parent, skip
                }
            }

            let busiestDay: { day: string; captures: number } | null = null;
            for (const [day, count] of Object.entries(dayMap)) {
                if (!busiestDay || count > busiestDay.captures) {
                    busiestDay = { day, captures: count };
                }
            }

            const topFiles = Object.entries(fileChanges)
                .filter(([file]) => !file.includes('.DS_Store') && !file.startsWith('.'))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([file, changes]) => ({
                    file: file.split('/').pop() || file,
                    path: file,
                    changes
                }));

            const uniqueDates = new Set(commits.map(c => new Date(c.date).toDateString()));
            const activeDays = uniqueDates.size;

            let summary = `In the last ${days} days, you made ${commits.length} capture${commits.length !== 1 ? 's' : ''}.`;

            if (busiestDay && busiestDay.captures > 1) {
                summary += ` Your most productive day was ${busiestDay.day} with ${busiestDay.captures} captures.`;
            }

            if (topFiles.length > 0) {
                const topFile = topFiles[0];
                summary += ` You worked most on "${topFile.file}" (${topFile.changes} change${topFile.changes !== 1 ? 's' : ''}).`;
            }

            return {
                success: true,
                summary,
                stats: {
                    totalCaptures: commits.length,
                    activeDays,
                    topFiles,
                    busiestDay
                }
            };
        } catch (error) {
            return {
                success: false,
                summary: `Could not narrate: ${error instanceof Error ? error.message : 'Unknown error'}`,
                stats: {
                    totalCaptures: 0,
                    activeDays: 0,
                    topFiles: [],
                    busiestDay: null
                }
            };
        }
    }

    /**
     * Check if this is a git repository
     */
    async isRepository(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current status summary for UI
     */
    async getStatusSummary(): Promise<StatusSummary> {
        try {
            const status = await this.git.status();
            const mainBranch = await this.getMainBranch();

            return {
                isRepo: true,
                currentExperiment: (status.current !== mainBranch) ? status.current : null,
                hasChanges: status.files.length > 0,
                aheadOfCloud: status.ahead,
                behindCloud: status.behind,
                hasConflicts: status.conflicted.length > 0
            };
        } catch {
            return {
                isRepo: false,
                currentExperiment: null,
                hasChanges: false,
                aheadOfCloud: 0,
                behindCloud: 0,
                hasConflicts: false
            };
        }
    }

    // Helper methods

    private async getMainBranch(): Promise<string> {
        try {
            const branches = await this.git.branchLocal();
            if (branches.all.includes('main')) return 'main';
            if (branches.all.includes('master')) return 'master';
            return 'main';
        } catch {
            return 'main';
        }
    }

    private getRelativeDate(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    }
}
