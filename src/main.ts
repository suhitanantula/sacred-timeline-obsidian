import { App, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, Notice, Modal, TextComponent } from 'obsidian';
import { SacredTimeline, TimelineEntry, StatusSummary, ChangesResult } from './git-wrapper';

const VIEW_TYPE_SACRED_TIMELINE = 'sacred-timeline-view';

interface SacredTimelineSettings {
    autoBackup: boolean;
    autoBackupInterval: number; // minutes
    showStatusBar: boolean;
    githubToken: string;
    githubUsername: string;
}

const DEFAULT_SETTINGS: SacredTimelineSettings = {
    autoBackup: false,
    autoBackupInterval: 30,
    showStatusBar: true,
    githubToken: '',
    githubUsername: ''
};

export default class SacredTimelinePlugin extends Plugin {
    settings: SacredTimelineSettings;
    sacred: SacredTimeline;
    statusBarItem: HTMLElement;
    autoBackupInterval: number | null = null;

    async onload() {
        await this.loadSettings();

        // Initialize Sacred Timeline with vault path
        const vaultPath = (this.app.vault.adapter as any).basePath;
        this.sacred = new SacredTimeline(vaultPath);

        // Register the sidebar view
        this.registerView(
            VIEW_TYPE_SACRED_TIMELINE,
            (leaf) => new SacredTimelineView(leaf, this)
        );

        // Add ribbon icon
        this.addRibbonIcon('git-branch', 'Sacred Timeline', () => {
            this.activateView();
        });

        // Add commands
        this.addCommand({
            id: 'capture',
            name: 'Capture: Save this moment',
            callback: () => this.captureCommand()
        });

        this.addCommand({
            id: 'update',
            name: 'Update: Get latest from cloud',
            callback: () => this.updateCommand()
        });

        this.addCommand({
            id: 'backup',
            name: 'Backup: Send to cloud',
            callback: () => this.backupCommand()
        });

        this.addCommand({
            id: 'changes',
            name: 'Changes: What did I change?',
            callback: () => this.changesCommand()
        });

        this.addCommand({
            id: 'timeline',
            name: 'Timeline: Show me history',
            callback: () => this.activateView()
        });

        this.addCommand({
            id: 'narrate',
            name: 'Narrate: Summarize my progress',
            callback: () => this.narrateCommand()
        });

        this.addCommand({
            id: 'experiment',
            name: 'Experiment: Try something risky',
            callback: () => this.experimentCommand()
        });

        this.addCommand({
            id: 'status',
            name: 'Status: Show current state',
            callback: () => this.statusCommand()
        });

        this.addCommand({
            id: 'connect',
            name: 'Connect: Link to GitHub',
            callback: () => this.connectCommand()
        });

        this.addCommand({
            id: 'start',
            name: 'Start: Begin fresh timeline',
            callback: () => this.startCommand()
        });

        // Status bar
        if (this.settings.showStatusBar) {
            this.statusBarItem = this.addStatusBarItem();
            this.updateStatusBar();

            // Update status bar periodically
            this.registerInterval(
                window.setInterval(() => this.updateStatusBar(), 30000)
            );
        }

        // Auto backup
        if (this.settings.autoBackup) {
            this.startAutoBackup();
        }

        // Settings tab
        this.addSettingTab(new SacredTimelineSettingTab(this.app, this));

        // Open view on startup if it was open before
        this.app.workspace.onLayoutReady(() => {
            this.activateView();
        });
    }

    onunload() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_SACRED_TIMELINE)[0];

        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({
                    type: VIEW_TYPE_SACRED_TIMELINE,
                    active: true
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async updateStatusBar() {
        if (!this.statusBarItem) return;

        const status = await this.sacred.getStatusSummary();
        const changes = await this.sacred.changes();

        const parts: string[] = ['📸'];

        if (status.currentExperiment) {
            parts.push(`🧪${status.currentExperiment}`);
        }

        if (changes.hasChanges) {
            const total = changes.staged.length + changes.unstaged.length + changes.untracked.length;
            parts.push(`${total}△`);
        }

        if (status.aheadOfCloud > 0) {
            parts.push(`↑${status.aheadOfCloud}`);
        }

        if (status.behindCloud > 0) {
            parts.push(`↓${status.behindCloud}`);
        }

        if (!changes.hasChanges && status.aheadOfCloud === 0 && status.behindCloud === 0) {
            parts.push('✓');
        }

        this.statusBarItem.setText(parts.join(' '));
    }

    startAutoBackup() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }

        this.autoBackupInterval = window.setInterval(async () => {
            const changes = await this.sacred.changes();
            if (changes.hasChanges) {
                const timestamp = new Date().toLocaleString();
                await this.sacred.capture(`Auto-backup: ${timestamp}`);
                await this.sacred.backup();
                new Notice('Sacred Timeline: Auto-backup complete');
            }
        }, this.settings.autoBackupInterval * 60 * 1000);
    }

    // Commands

    async captureCommand() {
        const changes = await this.sacred.changes();
        if (!changes.hasChanges) {
            new Notice('Nothing to capture - no changes detected');
            return;
        }

        new CaptureModal(this.app, async (message) => {
            const result = await this.sacred.capture(message);
            new Notice(result.message);
            this.updateStatusBar();
            this.refreshView();
        }).open();
    }

    async updateCommand() {
        new Notice('Updating from cloud...');
        const result = await this.sacred.update();
        new Notice(result.message);
        this.updateStatusBar();
        this.refreshView();
    }

    async backupCommand() {
        new Notice('Backing up to cloud...');
        const result = await this.sacred.backup();
        new Notice(result.message);
        this.updateStatusBar();
        this.refreshView();
    }

    async changesCommand() {
        const changes = await this.sacred.changes();
        if (!changes.hasChanges) {
            new Notice('No changes since last capture');
            return;
        }

        new ChangesModal(this.app, changes).open();
    }

    async narrateCommand() {
        new Notice('Analyzing your timeline...');
        const result = await this.sacred.narrate(7);
        new NarrateModal(this.app, result.summary, result.stats).open();
    }

    async experimentCommand() {
        new ExperimentModal(this.app, async (name) => {
            const result = await this.sacred.experiment(name);
            new Notice(result.message);
            this.updateStatusBar();
            this.refreshView();
        }).open();
    }

    async statusCommand() {
        const status = await this.sacred.getStatusSummary();
        const changes = await this.sacred.changes();

        let message = '';
        if (status.currentExperiment) {
            message += `🧪 Experiment: ${status.currentExperiment}\n`;
        } else {
            message += '● On main timeline\n';
        }

        if (changes.hasChanges) {
            message += `○ ${changes.summary}\n`;
        } else {
            message += '✓ No uncommitted changes\n';
        }

        if (status.aheadOfCloud > 0) {
            message += `↑ ${status.aheadOfCloud} to backup\n`;
        }
        if (status.behindCloud > 0) {
            message += `↓ ${status.behindCloud} to update\n`;
        }

        new Notice(message, 5000);
    }

    async connectCommand() {
        // Check if already connected
        const isRepo = await this.sacred.isRepository();

        if (!isRepo) {
            new Notice('No timeline yet. Run "Start" first to initialize.');
            return;
        }

        // Open the connect modal
        new ConnectModal(this.app, this, async (repoUrl, token, username) => {
            // Save credentials
            this.settings.githubToken = token;
            this.settings.githubUsername = username;
            await this.saveSettings();

            // Configure git credentials
            await this.sacred.configureCredentials(username, token);

            // Add remote
            const result = await this.sacred.connect(repoUrl);
            new Notice(result.message);

            this.updateStatusBar();
            this.refreshView();
        }).open();
    }

    async startCommand() {
        const isRepo = await this.sacred.isRepository();

        if (isRepo) {
            new Notice('Sacred Timeline already exists in this vault.');
            return;
        }

        const result = await this.sacred.start();
        new Notice(result.message);

        if (result.success) {
            // Prompt to connect
            new Notice('Now use "Connect" to link to GitHub.', 5000);
        }

        this.updateStatusBar();
        this.refreshView();
    }

    isConnected(): boolean {
        return !!(this.settings.githubToken && this.settings.githubUsername);
    }

    refreshView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SACRED_TIMELINE);
        leaves.forEach(leaf => {
            if (leaf.view instanceof SacredTimelineView) {
                leaf.view.refresh();
            }
        });
    }
}

// Sidebar View
class SacredTimelineView extends ItemView {
    plugin: SacredTimelinePlugin;

    constructor(leaf: WorkspaceLeaf, plugin: SacredTimelinePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_SACRED_TIMELINE;
    }

    getDisplayText() {
        return 'Sacred Timeline';
    }

    getIcon() {
        return 'git-branch';
    }

    async onOpen() {
        await this.refresh();
    }

    async refresh() {
        const container = this.containerEl.children[1];
        container.empty();

        const wrapper = container.createDiv({ cls: 'sacred-timeline-container' });

        // Header
        const header = wrapper.createDiv({ cls: 'sacred-timeline-header' });
        header.createEl('h2', { text: 'Sacred Timeline' });

        const status = await this.plugin.sacred.getStatusSummary();
        const changes = await this.plugin.sacred.changes();

        // Status badge
        const badge = header.createSpan({ cls: 'sacred-timeline-badge' });
        if (changes.hasChanges) {
            badge.setText(changes.summary);
            badge.addClass('has-changes');
        } else {
            badge.setText('All synced');
            badge.addClass('synced');
        }

        // Experiment banner
        if (status.currentExperiment) {
            const expBanner = wrapper.createDiv({ cls: 'sacred-timeline-experiment' });
            expBanner.createSpan({ text: '🧪 ' });
            expBanner.createSpan({ text: `Experiment: ${status.currentExperiment}` });
        }

        // Quick actions
        const actionsSection = wrapper.createDiv({ cls: 'sacred-timeline-section' });
        actionsSection.createEl('h3', { text: 'Quick Actions' });

        const actionsGrid = actionsSection.createDiv({ cls: 'sacred-timeline-actions' });

        const captureBtn = actionsGrid.createEl('button', { cls: 'sacred-timeline-btn primary' });
        captureBtn.createSpan({ text: '📸 Capture' });
        captureBtn.onclick = () => this.plugin.captureCommand();

        const updateBtn = actionsGrid.createEl('button', { cls: 'sacred-timeline-btn' });
        updateBtn.createSpan({ text: '⬇️ Update' });
        updateBtn.onclick = () => this.plugin.updateCommand();

        const backupBtn = actionsGrid.createEl('button', { cls: 'sacred-timeline-btn' });
        backupBtn.createSpan({ text: '☁️ Backup' });
        backupBtn.onclick = () => this.plugin.backupCommand();

        // Changes section
        if (changes.hasChanges) {
            const changesSection = wrapper.createDiv({ cls: 'sacred-timeline-section' });
            changesSection.createEl('h3', { text: 'Changes' });

            const changesList = changesSection.createDiv({ cls: 'sacred-timeline-changes' });

            [...changes.untracked, ...changes.unstaged, ...changes.staged].slice(0, 5).forEach(file => {
                const item = changesList.createDiv({ cls: 'sacred-timeline-change-item' });
                const indicator = item.createSpan({ cls: 'indicator' });
                if (changes.untracked.includes(file)) {
                    indicator.addClass('new');
                } else {
                    indicator.addClass('modified');
                }
                item.createSpan({ text: file.split('/').pop() || file });
            });

            if (changes.staged.length + changes.unstaged.length + changes.untracked.length > 5) {
                changesList.createDiv({
                    cls: 'sacred-timeline-more',
                    text: `+${changes.staged.length + changes.unstaged.length + changes.untracked.length - 5} more`
                });
            }
        }

        // Timeline section
        const timelineSection = wrapper.createDiv({ cls: 'sacred-timeline-section' });
        timelineSection.createEl('h3', { text: 'Recent Timeline' });

        const timeline = await this.plugin.sacred.timeline(5);
        const timelineList = timelineSection.createDiv({ cls: 'sacred-timeline-list' });

        if (timeline.length === 0) {
            timelineList.createDiv({ cls: 'sacred-timeline-empty', text: 'No captures yet' });
        } else {
            timeline.forEach((entry, i) => {
                const item = timelineList.createDiv({ cls: 'sacred-timeline-item' });
                const msg = entry.message.length > 40
                    ? entry.message.substring(0, 37) + '...'
                    : entry.message;
                item.createDiv({ cls: 'sacred-timeline-message', text: msg });
                item.createDiv({ cls: 'sacred-timeline-meta', text: entry.relativeDate });
            });
        }

        // Narrate button
        const narrateBtn = timelineSection.createEl('button', { cls: 'sacred-timeline-btn full-width' });
        narrateBtn.createSpan({ text: '📖 Narrate my progress' });
        narrateBtn.onclick = () => this.plugin.narrateCommand();

        // Experiments section
        const expSection = wrapper.createDiv({ cls: 'sacred-timeline-section' });
        expSection.createEl('h3', { text: 'Experiments' });

        const expBtn = expSection.createEl('button', { cls: 'sacred-timeline-btn full-width' });
        expBtn.createSpan({ text: '🧪 Start New Experiment' });
        expBtn.onclick = () => this.plugin.experimentCommand();

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styleEl = document.getElementById('sacred-timeline-styles');
        if (styleEl) return;

        const style = document.createElement('style');
        style.id = 'sacred-timeline-styles';
        style.textContent = `
            .sacred-timeline-container {
                padding: 16px;
            }
            .sacred-timeline-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
            }
            .sacred-timeline-header h2 {
                margin: 0;
                font-size: 16px;
            }
            .sacred-timeline-badge {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                background: var(--background-modifier-border);
            }
            .sacred-timeline-badge.has-changes {
                background: var(--background-modifier-error);
                color: var(--text-on-accent);
            }
            .sacred-timeline-badge.synced {
                background: var(--background-modifier-success);
            }
            .sacred-timeline-experiment {
                background: var(--background-modifier-border);
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 16px;
                font-size: 12px;
            }
            .sacred-timeline-section {
                margin-bottom: 20px;
            }
            .sacred-timeline-section h3 {
                font-size: 11px;
                text-transform: uppercase;
                color: var(--text-muted);
                margin-bottom: 8px;
            }
            .sacred-timeline-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .sacred-timeline-btn {
                padding: 8px 12px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-size: 12px;
                background: var(--background-modifier-border);
            }
            .sacred-timeline-btn:hover {
                background: var(--background-modifier-hover);
            }
            .sacred-timeline-btn.primary {
                grid-column: span 2;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
            }
            .sacred-timeline-btn.full-width {
                width: 100%;
                margin-top: 8px;
            }
            .sacred-timeline-changes {
                background: var(--background-secondary);
                border-radius: 4px;
                padding: 8px;
            }
            .sacred-timeline-change-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
                font-size: 12px;
            }
            .sacred-timeline-change-item .indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .sacred-timeline-change-item .indicator.new {
                background: var(--text-accent);
            }
            .sacred-timeline-change-item .indicator.modified {
                background: var(--text-warning);
            }
            .sacred-timeline-list {
                background: var(--background-secondary);
                border-radius: 4px;
                padding: 8px;
            }
            .sacred-timeline-item {
                padding: 8px 0;
                border-bottom: 1px solid var(--background-modifier-border);
            }
            .sacred-timeline-item:last-child {
                border-bottom: none;
            }
            .sacred-timeline-message {
                font-size: 12px;
                margin-bottom: 4px;
            }
            .sacred-timeline-meta {
                font-size: 10px;
                color: var(--text-muted);
            }
            .sacred-timeline-empty {
                text-align: center;
                padding: 16px;
                color: var(--text-muted);
                font-size: 12px;
            }
            .sacred-timeline-more {
                font-size: 11px;
                color: var(--text-muted);
                padding-top: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    async onClose() {
        // Nothing to clean up
    }
}

// Modals

class CaptureModal extends Modal {
    message: string = '';
    onSubmit: (message: string) => void;

    constructor(app: App, onSubmit: (message: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Capture this moment' });
        contentEl.createEl('p', { text: 'What did you learn or accomplish?', cls: 'sacred-timeline-modal-hint' });

        const inputEl = new TextComponent(contentEl);
        inputEl.setPlaceholder('e.g., "Finished draft of chapter 3"');
        inputEl.inputEl.style.width = '100%';
        inputEl.onChange((value) => this.message = value);

        inputEl.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.message.trim()) {
                this.close();
                this.onSubmit(this.message);
            }
        });

        const btnContainer = contentEl.createDiv({ cls: 'sacred-timeline-modal-buttons' });

        const submitBtn = btnContainer.createEl('button', { text: 'Capture', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            if (this.message.trim()) {
                this.close();
                this.onSubmit(this.message);
            }
        };

        const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        inputEl.inputEl.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ExperimentModal extends Modal {
    name: string = '';
    onSubmit: (name: string) => void;

    constructor(app: App, onSubmit: (name: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Start an Experiment' });
        contentEl.createEl('p', { text: 'Name your experiment (a safe space to try risky changes)', cls: 'sacred-timeline-modal-hint' });

        const inputEl = new TextComponent(contentEl);
        inputEl.setPlaceholder('e.g., "bold-new-intro"');
        inputEl.inputEl.style.width = '100%';
        inputEl.onChange((value) => this.name = value);

        inputEl.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.name.trim()) {
                this.close();
                this.onSubmit(this.name);
            }
        });

        const btnContainer = contentEl.createDiv({ cls: 'sacred-timeline-modal-buttons' });

        const submitBtn = btnContainer.createEl('button', { text: 'Start Experiment', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            if (this.name.trim()) {
                this.close();
                this.onSubmit(this.name);
            }
        };

        const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        inputEl.inputEl.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ChangesModal extends Modal {
    changes: ChangesResult;

    constructor(app: App, changes: ChangesResult) {
        super(app);
        this.changes = changes;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Changes' });
        contentEl.createEl('p', { text: this.changes.summary });

        if (this.changes.untracked.length > 0) {
            contentEl.createEl('h3', { text: 'New files' });
            const list = contentEl.createEl('ul');
            this.changes.untracked.forEach(f => list.createEl('li', { text: f }));
        }

        if (this.changes.unstaged.length > 0) {
            contentEl.createEl('h3', { text: 'Modified' });
            const list = contentEl.createEl('ul');
            this.changes.unstaged.forEach(f => list.createEl('li', { text: f }));
        }

        if (this.changes.staged.length > 0) {
            contentEl.createEl('h3', { text: 'Ready to capture' });
            const list = contentEl.createEl('ul');
            this.changes.staged.forEach(f => list.createEl('li', { text: f }));
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class NarrateModal extends Modal {
    summary: string;
    stats: any;

    constructor(app: App, summary: string, stats: any) {
        super(app);
        this.summary = summary;
        this.stats = stats;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '📖 Your Story' });
        contentEl.createEl('p', { text: this.summary });

        if (this.stats.topFiles && this.stats.topFiles.length > 0) {
            contentEl.createEl('h3', { text: 'Most Active Files' });
            const list = contentEl.createEl('ul');
            this.stats.topFiles.forEach((f: any) => {
                list.createEl('li', { text: `${f.file} (${f.changes} changes)` });
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ConnectModal extends Modal {
    plugin: SacredTimelinePlugin;
    repoUrl: string = '';
    token: string = '';
    username: string = '';
    onSubmit: (repoUrl: string, token: string, username: string) => void;

    constructor(app: App, plugin: SacredTimelinePlugin, onSubmit: (repoUrl: string, token: string, username: string) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '🔗 Connect to GitHub' });

        // Step 1: Create repo instruction
        const step1 = contentEl.createDiv({ cls: 'sacred-timeline-connect-step' });
        step1.createEl('h3', { text: 'Step 1: Create a GitHub repository' });
        step1.createEl('p', { text: 'Go to GitHub and create a new repository for your vault.' });
        const githubBtn = step1.createEl('button', { text: 'Open GitHub →' });
        githubBtn.onclick = () => window.open('https://github.com/new', '_blank');

        // Step 2: Get token
        const step2 = contentEl.createDiv({ cls: 'sacred-timeline-connect-step' });
        step2.createEl('h3', { text: 'Step 2: Create a Personal Access Token' });
        step2.createEl('p', { text: 'You need a token to let Sacred Timeline access your repository.' });
        const tokenBtn = step2.createEl('button', { text: 'Create Token →' });
        tokenBtn.onclick = () => window.open('https://github.com/settings/tokens/new?description=Sacred%20Timeline&scopes=repo', '_blank');

        const tokenHint = step2.createEl('p', { cls: 'sacred-timeline-hint' });
        tokenHint.innerHTML = '✓ Check the <strong>repo</strong> scope<br>✓ Set expiration (90 days recommended)<br>✓ Copy the token - you won\'t see it again!';

        // Step 3: Enter details
        const step3 = contentEl.createDiv({ cls: 'sacred-timeline-connect-step' });
        step3.createEl('h3', { text: 'Step 3: Enter your details' });

        // Username input
        const usernameContainer = step3.createDiv({ cls: 'sacred-timeline-input-group' });
        usernameContainer.createEl('label', { text: 'GitHub Username' });
        const usernameInput = new TextComponent(usernameContainer);
        usernameInput.setPlaceholder('your-username');
        usernameInput.inputEl.style.width = '100%';
        usernameInput.onChange((value) => this.username = value);

        // Token input
        const tokenContainer = step3.createDiv({ cls: 'sacred-timeline-input-group' });
        tokenContainer.createEl('label', { text: 'Personal Access Token' });
        const tokenInput = new TextComponent(tokenContainer);
        tokenInput.setPlaceholder('ghp_xxxxxxxxxxxx');
        tokenInput.inputEl.style.width = '100%';
        tokenInput.inputEl.type = 'password';
        tokenInput.onChange((value) => this.token = value);

        // Repo URL input
        const repoContainer = step3.createDiv({ cls: 'sacred-timeline-input-group' });
        repoContainer.createEl('label', { text: 'Repository URL' });
        const repoInput = new TextComponent(repoContainer);
        repoInput.setPlaceholder('https://github.com/username/my-vault.git');
        repoInput.inputEl.style.width = '100%';
        repoInput.onChange((value) => this.repoUrl = value);

        // Auto-fill repo URL when username changes
        usernameInput.onChange((value) => {
            this.username = value;
            if (value && !this.repoUrl) {
                repoInput.setPlaceholder(`https://github.com/${value}/my-vault.git`);
            }
        });

        // Buttons
        const btnContainer = contentEl.createDiv({ cls: 'sacred-timeline-modal-buttons' });

        const submitBtn = btnContainer.createEl('button', { text: 'Connect', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            if (!this.username.trim()) {
                new Notice('Please enter your GitHub username');
                return;
            }
            if (!this.token.trim()) {
                new Notice('Please enter your Personal Access Token');
                return;
            }
            if (!this.repoUrl.trim()) {
                new Notice('Please enter your repository URL');
                return;
            }
            this.close();
            this.onSubmit(this.repoUrl, this.token, this.username);
        };

        const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        // Add styles for this modal
        const style = document.createElement('style');
        style.textContent = `
            .sacred-timeline-connect-step {
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--background-modifier-border);
            }
            .sacred-timeline-connect-step h3 {
                margin: 0 0 8px 0;
                font-size: 14px;
            }
            .sacred-timeline-connect-step p {
                margin: 4px 0;
                font-size: 13px;
                color: var(--text-muted);
            }
            .sacred-timeline-connect-step button {
                margin-top: 8px;
            }
            .sacred-timeline-hint {
                background: var(--background-secondary);
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                margin-top: 8px;
            }
            .sacred-timeline-input-group {
                margin-bottom: 12px;
            }
            .sacred-timeline-input-group label {
                display: block;
                font-size: 12px;
                margin-bottom: 4px;
                color: var(--text-muted);
            }
            .sacred-timeline-modal-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 16px;
            }
        `;
        contentEl.appendChild(style);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Settings Tab
class SacredTimelineSettingTab extends PluginSettingTab {
    plugin: SacredTimelinePlugin;

    constructor(app: App, plugin: SacredTimelinePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Sacred Timeline Settings' });

        new Setting(containerEl)
            .setName('Show status bar')
            .setDesc('Show Sacred Timeline status in the status bar')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showStatusBar)
                .onChange(async (value) => {
                    this.plugin.settings.showStatusBar = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto backup')
            .setDesc('Automatically capture and backup changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoBackup)
                .onChange(async (value) => {
                    this.plugin.settings.autoBackup = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.plugin.startAutoBackup();
                    }
                }));

        new Setting(containerEl)
            .setName('Auto backup interval')
            .setDesc('Minutes between auto backups')
            .addText(text => text
                .setValue(String(this.plugin.settings.autoBackupInterval))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.autoBackupInterval = num;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
