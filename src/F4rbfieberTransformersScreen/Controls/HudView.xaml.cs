using System.Text.Json;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using F4rbfieberTransformersScreen.Models;
using F4rbfieberTransformersScreen.Services;
using Microsoft.Web.WebView2.Core;

namespace F4rbfieberTransformersScreen.Controls;

public partial class HudView : System.Windows.Controls.UserControl, IDisposable
{
    private static readonly string[] ProfileIds =
        ["grimlock", "hound", "optimus", "bumblebee", "ironhide", "jazz", "megatron", "shockwave", "soundwave"];
    private static readonly Lazy<Task<CoreWebView2Environment>> SharedWebViewEnvironment =
        new(CreateWebViewEnvironmentAsync);
    private static readonly object SharedTelemetryLock = new();
    private static readonly object RandomProfileLock = new();
    private static Task<TelemetryService>? SharedTelemetryInitialization;
    private static string? SharedRandomProfile;

    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private readonly DispatcherTimer _timer;
    private TelemetryService? _telemetry;
    private Task<TelemetryService>? _telemetryInitialization;
    private Task<SystemTelemetry>? _initialTelemetryRead;
    private SettingsService? _settingsService;
    private AppSettings _settings = new();
    private bool _previewMode;
    private bool _ready;
    private bool _disposed;
    private bool _ownsTelemetry;
    private int _telemetryReadInProgress;

    public event EventHandler? SettingsRequested;
    public event EventHandler? ExitRequested;

    public HudView()
    {
        InitializeComponent();
        _timer = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(750) };
        _timer.Tick += SendTelemetry;
        Loaded += Initialize;
    }

    public static void WarmUp()
    {
        _ = SharedWebViewEnvironment.Value;
    }

    public static void ShutdownSharedTelemetry()
    {
        Task<TelemetryService>? initialization;
        lock (SharedTelemetryLock)
        {
            initialization = SharedTelemetryInitialization;
            SharedTelemetryInitialization = null;
        }

        if (initialization is null) return;
        if (initialization.IsCompletedSuccessfully)
            initialization.Result.Dispose();
        else
            _ = initialization.ContinueWith(task =>
            {
                if (task.IsCompletedSuccessfully) task.Result.Dispose();
            }, TaskScheduler.Default);
    }

    public void Configure(SettingsService settingsService, bool previewMode)
    {
        _settingsService = settingsService;
        _previewMode = previewMode;
        _settings = settingsService.Load();
        _timer.Interval = _settings.EnergySavingMode ? TimeSpan.FromMilliseconds(2000) : TimeSpan.FromMilliseconds(750);
        StartTelemetryInitialization();
    }

    public void Disable()
    {
        Loaded -= Initialize;
        Visibility = Visibility.Collapsed;
    }

    public void ReloadSettings()
    {
        if (_settingsService is null) return;
        _settings = _settingsService.Load();
        SendEnvelope("settings", _settings);
    }

    private async void Initialize(object sender, RoutedEventArgs e)
    {
        if (_ready || _disposed) return;
        try
        {
            var webViewEnvironment = await SharedWebViewEnvironment.Value;
            await Browser.EnsureCoreWebView2Async(webViewEnvironment);
            Browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            Browser.CoreWebView2.Settings.AreDevToolsEnabled = !_previewMode;
            Browser.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = !_previewMode;
            Browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            Browser.CoreWebView2.WebMessageReceived += OnWebMessage;
            Browser.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
            Browser.CoreWebView2.ProcessFailed += (s, ev) => 
            {
                Dispatcher.Invoke(() => {
                    Fallback.Visibility = Visibility.Visible;
                    FallbackMessage.Text = $"WEBVIEW CRASH: {ev.ProcessFailedKind}\nIf this happens frequently, disable mode switching in settings.";
                });
            };

            var webRoot = Path.Combine(AppContext.BaseDirectory, "Web");
            if (!Directory.Exists(webRoot)) throw new DirectoryNotFoundException($"Web assets not found: {webRoot}");
            Browser.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "cybertron.local", webRoot, CoreWebView2HostResourceAccessKind.DenyCors);
            
            var initialProfile = ResolveInitialProfile(_settings);
            var query = new List<string>
            {
                $"profile={Uri.EscapeDataString(initialProfile)}",
                $"form={Uri.EscapeDataString(_settings.StartForm)}"
            };
            var url = $"https://cybertron.local/index.html?{string.Join('&', query)}";
            Browser.Source = new Uri(url);

        }
        catch (Exception ex)
        {
            if (!_previewMode)
            {
                Fallback.Visibility = Visibility.Visible;
                FallbackMessage.Text = "Microsoft Edge WebView2 Runtime konnte nicht initialisiert werden.\n" + ex.Message;
            }
        }
    }

    private static Task<CoreWebView2Environment> CreateWebViewEnvironmentAsync()
    {
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "TransformersScreen",
            "WebView2");
        Directory.CreateDirectory(userDataFolder);
        return CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
    }

    private static string ResolveInitialProfile(AppSettings settings)
    {
        if (string.Equals(settings.TransformerProfile, "random", StringComparison.OrdinalIgnoreCase))
        {
            var candidates = string.Equals(settings.ProfileMode, "cycle", StringComparison.OrdinalIgnoreCase)
                ? settings.SelectedTransformerProfiles.Where(ProfileIds.Contains).ToArray()
                : ProfileIds;
            if (candidates.Length == 0) candidates = ["optimus"];
            lock (RandomProfileLock)
                return SharedRandomProfile ??= candidates[Random.Shared.Next(candidates.Length)];
        }
        if (!string.Equals(settings.ProfileMode, "cycle", StringComparison.OrdinalIgnoreCase))
            return settings.TransformerProfile;
        return settings.SelectedTransformerProfiles.Contains(settings.TransformerProfile, StringComparer.OrdinalIgnoreCase)
            ? settings.TransformerProfile
            : settings.SelectedTransformerProfiles[0];
    }

    private void StartTelemetryInitialization()
    {
        if (_disposed || _telemetryInitialization is not null) return;
        if (_settings.ShowRealData)
        {
            lock (SharedTelemetryLock)
                _telemetryInitialization = SharedTelemetryInitialization ??=
                    Task.Run(() => new TelemetryService(initializeHardware: true));
        }
        else
        {
            _ownsTelemetry = true;
            _telemetryInitialization = Task.Run(() => new TelemetryService(initializeHardware: false));
        }
        _initialTelemetryRead = ReadInitialTelemetryAsync(_telemetryInitialization, _settings);
    }

    private static Task<SystemTelemetry> ReadInitialTelemetryAsync(
        Task<TelemetryService> initialization,
        AppSettings settings) =>
        Task.Run(async () =>
        {
            var telemetry = await initialization.ConfigureAwait(false);
            return telemetry.Read(settings);
        });

    private async void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess) return;
        _ready = true;
        SendEnvelope("settings", _settings);
        StartTelemetryInitialization();
        try
        {
            var telemetry = await _telemetryInitialization!;
            var initialPayload = await _initialTelemetryRead!;
            if (_disposed) return;
            _telemetry = telemetry;
            SendEnvelope("telemetry", initialPayload);
            _timer.Start();
        }
        catch
        {
            // The built-in animated fallback stays active when sensors are unavailable.
        }
    }

    private async void SendTelemetry(object? sender, EventArgs e)
    {
        var telemetry = _telemetry;
        if (!_ready || telemetry is null || _disposed || Interlocked.Exchange(ref _telemetryReadInProgress, 1) != 0) return;
        try
        {
            var settings = _settings;
            var payload = await Task.Run(() => telemetry.Read(settings));
            if (!_disposed && _ready && ReferenceEquals(telemetry, _telemetry))
                SendEnvelope("telemetry", payload);
        }
        catch { /* A failed sensor sample must never stop the renderer. */ }
        finally { Interlocked.Exchange(ref _telemetryReadInProgress, 0); }
    }

    private void SendEnvelope<T>(string type, T payload)
    {
        if (!_ready || Browser.CoreWebView2 is null) return;
        var message = JsonSerializer.Serialize(new { type, payload }, _json);
        Browser.CoreWebView2.PostWebMessageAsJson(message);
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var document = JsonDocument.Parse(e.WebMessageAsJson);
            var command = document.RootElement.TryGetProperty("command", out var value) ? value.GetString() : null;
            if (command == "openSettings" && !_previewMode)
                SettingsRequested?.Invoke(this, EventArgs.Empty);
            else if (command == "setTransformerProfile" && document.RootElement.TryGetProperty("value", out var profileValue))
            {
                var profile = profileValue.GetString();
                if (profile is "grimlock" or "hound" or "optimus" or "bumblebee" or "ironhide" or "jazz"
                    or "megatron" or "shockwave" or "soundwave" && _settingsService is not null)
                {
                    _settings.TransformerProfile = profile;
                    _settingsService.Save(_settings);
                }
            }
            else if (command == "exit")
                ExitRequested?.Invoke(this, EventArgs.Empty);
        }
        catch { }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _timer.Stop();
        if (_ownsTelemetry) _telemetry?.Dispose();
        if (Browser.CoreWebView2 is not null)
        {
            Browser.CoreWebView2.WebMessageReceived -= OnWebMessage;
            Browser.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
        }
        Browser.Dispose();
    }
}
