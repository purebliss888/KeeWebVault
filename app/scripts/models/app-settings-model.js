import { Model } from 'framework/model';
import { SettingsStore } from 'comp/settings/settings-store';
import { DefaultAppSettings } from 'const/default-app-settings';

const EmbeddedAppSettingKeys = [
    'theme',
    'autoSwitchTheme',
    'locale',
    'fontSize',
    'expandGroups',
    'listViewWidth',
    'menuViewWidth',
    'tagsViewHeight',
    'tableView',
    'tableViewColumns',
    'colorfulIcons',
    'useMarkdown',
    'hideEmptyFields',
    'useGroupIconForEntries',
    'directAutotype',
    'autoTypeTitleFilterEnabled',
    'fieldLabelDblClickAutoType',
    'generatorPresets',
    'generatorHidePassword',
    'clipboardSeconds',
    'idleMinutes',
    'lockOnMinimize',
    'lockOnCopy',
    'lockOnAutoType',
    'lockOnOsLock',
    'auditPasswords',
    'auditPasswordEntropy',
    'excludePinsFromAudit',
    'checkPasswordsOnHIBP',
    'auditPasswordAge'
];

let embeddedSettingsActive = false;

function isValidEmbeddedSetting(key, value) {
    const nullableSettings = [
        'theme',
        'locale',
        'listViewWidth',
        'menuViewWidth',
        'tagsViewHeight',
        'tableViewColumns',
        'generatorPresets'
    ];

    if (value === null) {
        return nullableSettings.includes(key);
    }

    const defaultValue = DefaultAppSettings[key];

    if (typeof defaultValue === 'boolean') {
        return typeof value === 'boolean';
    }

    if (typeof defaultValue === 'number') {
        return typeof value === 'number' && Number.isFinite(value);
    }

    if (typeof defaultValue === 'string') {
        return typeof value === 'string';
    }

    if (key === 'theme' || key === 'locale') {
        return typeof value === 'string';
    }

    if (key === 'listViewWidth' || key === 'menuViewWidth' || key === 'tagsViewHeight') {
        return typeof value === 'number' && Number.isFinite(value);
    }

    if (key === 'tableViewColumns') {
        return Array.isArray(value) && value.every((item) => typeof item === 'string');
    }

    if (key === 'generatorPresets') {
        return typeof value === 'object' && !Array.isArray(value);
    }

    return false;
}

function readEmbeddedSettings() {
    const template = document.getElementById('keeweb-embedded-settings');

    if (!template || !template.content) {
        return null;
    }

    if (template.getAttribute('data-version') !== '1') {
        return null;
    }

    const encoded = template.content.textContent.trim();

    if (!encoded) {
        return null;
    }

    try {
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const data = JSON.parse(new TextDecoder().decode(bytes));

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return null;
        }

        const settings = {};

        for (const key of EmbeddedAppSettingKeys) {
            if (
                Object.prototype.hasOwnProperty.call(data, key) &&
                isValidEmbeddedSetting(key, data[key])
            ) {
                settings[key] = data[key];
            }
        }

        return Object.keys(settings).length ? settings : null;
    } catch (err) {
        return null;
    }
}

class AppSettingsModel extends Model {
    constructor() {
        super();
        this.on('change', () => this.save());
    }

    load() {
        embeddedSettingsActive = false;

        return SettingsStore.load('app-settings').then((data) => {
            if (data) {
                this.upgrade(data);
                this.set(data, { silent: true });
            }

            const embeddedSettings = readEmbeddedSettings();

            if (embeddedSettings) {
                this.upgrade(embeddedSettings);
                this.set(embeddedSettings, { silent: true });
                embeddedSettingsActive = true;
            }
        });
    }

    upgrade(data) {
        if (data.rememberKeyFiles === true) {
            data.rememberKeyFiles = 'data';
        }
        if (data.locale === 'en') {
            data.locale = 'en-US';
        }
        if (data.theme === 'macdark') {
            data.theme = 'dark';
        }
        if (data.theme === 'wh') {
            data.theme = 'light';
        }
    }

    save() {
        if (embeddedSettingsActive) {
            return;
        }

        const values = {};
        for (const [key, value] of Object.entries(this)) {
            if (DefaultAppSettings[key] !== value) {
                values[key] = value;
            }
        }
        SettingsStore.save('app-settings', values);
    }

    getEmbeddedSettings() {
        const settings = {};

        for (const key of EmbeddedAppSettingKeys) {
            if (this[key] !== undefined) {
                settings[key] = this[key];
            }
        }

        return settings;
    }
}

AppSettingsModel.defineModelProperties(DefaultAppSettings, { extensions: true });

const instance = new AppSettingsModel();

export { instance as AppSettingsModel };
