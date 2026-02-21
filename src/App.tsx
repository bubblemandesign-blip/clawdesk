import { useState, useEffect } from 'react';
import OnboardingScreen from './screens/OnboardingScreen';
import LoadingScreen from './screens/LoadingScreen';
import ErrorScreen from './screens/ErrorScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen, { AdvancedOptions } from './screens/SettingsScreen';
import { validateKey } from './lib/validate';
import { writeConfig, setupWorkspace, detectProvider } from './lib/config';
import { bootstrap } from './lib/bootstrap';
import { startGateway, waitForGateway, stopGateway } from './lib/gateway';
import { saveApiKey, saveProvider, getApiKey, getProvider, saveSetupComplete, isSetupComplete } from './lib/store';
import './App.css';

type AppState =
  | 'LOADING'        // Checking stored settings
  | 'ONBOARDING'     // User enters API key
  | 'VALIDATING'     // Checking the key
  | 'KEY_ERROR'      // Key is invalid
  | 'BOOTSTRAPPING'  // First-time install
  | 'STARTING'       // Starting gateway
  | 'FAILED'         // Something went wrong
  | 'READY';         // Chat is open

export default function App() {
  const [state, setState] = useState<AppState>('LOADING');
  const [progress, setProgress] = useState({ msg: '', pct: 0 });
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    launchOnStartup: false,
    fullFileSystem: false,
    browserWithLogin: false,
    autoApproveSafe: false,
    skillAutoInstall: false,
  });

  // On mount: check if we have stored settings
  useEffect(() => {
    checkExisting();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGateway();
    };
  }, []);

  async function checkExisting() {
    try {
      const key = await getApiKey();
      const provider = await getProvider();
      const setupDone = await isSetupComplete();

      if (key && provider && setupDone) {
        await startFromExisting(key, provider);
      } else {
        setState('ONBOARDING');
      }
    } catch {
      setState('ONBOARDING');
    }
  }

  async function startFromExisting(key: string, provider: string, options?: AdvancedOptions) {
    setState('STARTING');
    setProgress({ msg: 'Starting ClawDesk...', pct: 80 });

    try {
      // Re-write config with potentially new options
      await writeConfig(key, options || advancedOptions);

      await startGateway(key, provider);
      const result = await waitForGateway(30000);

      if (result === 'ready') {
        setState('READY');
      } else {
        setError('Engine failed to start. Please restart ClawDesk.');
        setState('FAILED');
      }
    } catch (e: any) {
      setError(`Failed to start: ${e?.message || e}`);
      setState('FAILED');
    }
  }

  async function handleStart(apiKey: string) {
    // Step 1: Validate key
    setState('VALIDATING');
    setProgress({ msg: 'Checking your API key...', pct: 5 });

    const validation = await validateKey(apiKey);
    if (!validation.ok) {
      setError(validation.msg);
      setState('KEY_ERROR');
      return;
    }

    const provider = detectProvider(apiKey);

    // Step 2: Save to secure store
    await saveApiKey(apiKey);
    await saveProvider(provider);

    // Step 3: Write OpenClaw config
    setProgress({ msg: 'Configuring AI engine...', pct: 10 });
    try {
      await writeConfig(apiKey, advancedOptions);
      await setupWorkspace();
    } catch (e: any) {
      setError(`Config failed: ${e?.message || e}`);
      setState('FAILED');
      return;
    }

    // Step 4: Bootstrap (first-time only)
    setState('BOOTSTRAPPING');
    try {
      await bootstrap((msg, pct) => {
        // Scale bootstrap progress to 15-85%
        const scaled = 15 + (pct / 100) * 70;
        setProgress({ msg, pct: scaled });
      });
    } catch (e: any) {
      setError(`Setup failed: ${e?.message || e}. Check your internet and try again.`);
      setState('FAILED');
      return;
    }

    // Step 5: Start gateway
    setState('STARTING');
    setProgress({ msg: 'Starting AI engine...', pct: 90 });

    try {
      await startGateway(apiKey, provider);
      const result = await waitForGateway(60000);

      if (result === 'ready') {
        await saveSetupComplete(true);
        setState('READY');
      } else {
        setError('Engine failed to start. Please try restarting ClawDesk.');
        setState('FAILED');
      }
    } catch (e: any) {
      setError(`Failed to start: ${e?.message || e}`);
      setState('FAILED');
    }
  }

  async function handleSettingsSave(newOptions: AdvancedOptions) {
    setAdvancedOptions(newOptions);
    setShowSettings(false);

    const { invoke } = await import('@tauri-apps/api/core');

    // Handle Launch on Startup (Windows only for now)
    try {
      const platform = await invoke('get_platform') as string;
      if (platform === 'windows') {
        const appPath = await invoke('run_sync_command', { cmd: 'powershell', args: ['-Command', '[System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName'] }) as string;
        const startupDir = await invoke('run_sync_command', { cmd: 'powershell', args: ['-Command', '$env:APPDATA + "\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"'] }) as string;
        const shortcutPath = `${startupDir.trim()}\\ClawDesk.lnk`;

        if (newOptions.launchOnStartup) {
          await invoke('run_sync_command', {
            cmd: 'powershell',
            args: ['-Command', `$s=(New-Object -Com Object WScript.Shell).CreateShortcut('${shortcutPath}');$s.TargetPath='${appPath.trim()}';$s.Save()`]
          });
        } else {
          await invoke('run_sync_command', { cmd: 'powershell', args: ['-Command', `if(Test-Path '${shortcutPath}'){ Remove-Item '${shortcutPath}' }`] });
        }
      }
    } catch (e) {
      console.error('Failed to update startup settings:', e);
    }

    // Trigger restart
    const key = await getApiKey();
    const provider = await getProvider();
    if (key && provider) {
      await stopGateway();
      await startFromExisting(key, provider, newOptions);
    }
  }

  function handleRetry() {
    setError('');
    setState('ONBOARDING');
  }

  // Render based on state
  return (
    <>
      {state === 'LOADING' && (
        <div className="screen loading-screen">
          <div className="loading-card">
            <div className="logo-icon logo-pulse">🦾</div>
          </div>
        </div>
      )}

      {(state === 'ONBOARDING' || state === 'KEY_ERROR') && (
        <OnboardingScreen
          onStart={handleStart}
          error={error}
          loading={false}
        />
      )}

      {state === 'VALIDATING' && (
        <OnboardingScreen
          onStart={handleStart}
          error=""
          loading={true}
        />
      )}

      {(state === 'BOOTSTRAPPING' || state === 'STARTING') && (
        <LoadingScreen
          msg={progress.msg}
          pct={progress.pct}
        />
      )}

      {state === 'FAILED' && (
        <ErrorScreen
          msg={error}
          onRetry={handleRetry}
        />
      )}

      {state === 'READY' && (
        <ChatScreen onOpenSettings={() => setShowSettings(true)} />
      )}

      {showSettings && (
        <SettingsScreen
          currentOptions={advancedOptions}
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </>
  );
}
