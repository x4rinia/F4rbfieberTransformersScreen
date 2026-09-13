using System.IO;
using System.Text.Json;
using F4rbfieberTransformersScreen.Models;

namespace F4rbfieberTransformersScreen.Services;

public sealed class SettingsService
{
    private static readonly string[] ProfileIds =
        ["grimlock", "hound", "optimus", "bumblebee", "ironhide", "jazz", "megatron", "shockwave", "soundwave"];

    private readonly string _settingsPath;
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public SettingsService()
    {
        var directory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "TransformersScreen");
        Directory.CreateDirectory(directory);
        _settingsPath = Path.Combine(directory, "settings.json");
    }

    public string SettingsPath => _settingsPath;

    public AppSettings Load()
    {
        try
        {
            if (!File.Exists(_settingsPath)) return new AppSettings();
            var settings = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(_settingsPath), _jsonOptions)
                           ?? new AppSettings();
            Normalize(settings);
            return settings;
        }
        catch
        {
            return new AppSettings();
        }
    }

    public void Save(AppSettings settings)
    {
        Normalize(settings);
        var temporaryPath = _settingsPath + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(settings, _jsonOptions));
        File.Move(temporaryPath, _settingsPath, true);
    }

    private static void Normalize(AppSettings settings)
    {
        settings.CustomName = settings.CustomName?.Trim() ?? string.Empty;
        if (settings.CustomName.Length > 30) settings.CustomName = settings.CustomName.Substring(0, 30);
        
        settings.TransformerProfile = settings.TransformerProfile?.Trim().ToLowerInvariant() switch
        {
            "bumblebee" => "bumblebee",
            "grimlock" => "grimlock",
            "hound" => "hound",
            "ironhide" => "ironhide",
            "jazz" => "jazz",
            "megatron" => "megatron",
            "shockwave" => "shockwave",
            "soundwave" => "soundwave",
            _ => "optimus"
        };
        var validProfileIds = ProfileIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
        settings.SelectedTransformerProfiles = (settings.SelectedTransformerProfiles ?? [])
            .Select(id => id?.Trim().ToLowerInvariant())
            .Where(id => id is not null && validProfileIds.Contains(id))
            .Cast<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (settings.SelectedTransformerProfiles.Count == 0)
            settings.SelectedTransformerProfiles.Add(settings.TransformerProfile);
        settings.ProfileMode = settings.ProfileMode?.Trim().ToLowerInvariant() == "cycle" ? "cycle" : "fixed";
        settings.TransformerStyle = settings.TransformerStyle?.Trim().ToLowerInvariant() == "film" ? "film" : "comic";
        // The form is no longer user-configurable. Every session starts as a robot;
        // the configured transformation interval continues to switch forms automatically.
        settings.StartForm = "robot";
        settings.MonitorTarget = settings.MonitorTarget?.Trim().ToLowerInvariant() switch
        {
            "all" => "all",
            "2" => "2",
            "3" => "3",
            _ => "1"
        };
        settings.AnimationQuality = settings.AnimationQuality?.Trim().ToLowerInvariant() switch
        {
            "low" => "Low",
            "medium" => "Medium",
            _ => "High"
        };
        settings.TargetFps = settings.TargetFps is 30 or 45 or 60 ? settings.TargetFps : 60;
        settings.TransformationIntervalSeconds = settings.TransformationIntervalSeconds switch
        {
            0 => 0,
            5 => 5,
            10 => 10,
            15 => 15,
            30 => 30,
            _ => 15
        };
        settings.ProfileCycleIntervalSeconds = Math.Clamp(settings.ProfileCycleIntervalSeconds, 30, 600);
        settings.RandomEvents = settings.RandomEvents?.Trim().ToLowerInvariant() switch
        {
            "off" => "off",
            "rare" => "rare",
            _ => "normal"
        };
    }
}
