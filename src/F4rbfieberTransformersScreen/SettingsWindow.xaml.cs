using System.Windows;
using System.Windows.Controls;
using F4rbfieberTransformersScreen.Models;
using F4rbfieberTransformersScreen.Services;

namespace F4rbfieberTransformersScreen;

public partial class SettingsWindow : Window
{
    private readonly SettingsService _settingsService;

    public SettingsWindow(SettingsService settingsService)
    {
        _settingsService = settingsService;
        InitializeComponent();
        LoadSettings(settingsService.Load());
        PathText.Text = settingsService.SettingsPath;
    }

    private void LoadSettings(AppSettings settings)
    {
        RealDataCheck.IsChecked = settings.ShowRealData;
        EventsCheck.IsChecked = settings.EnableEvents;
        Select(MonitorCombo, settings.MonitorTarget, useTag: true);
        Select(FpsCombo, settings.TargetFps.ToString(), useTag: false);
        Select(QualityCombo, settings.AnimationQuality, useTag: false);
        Select(ProfileModeCombo, settings.ProfileMode, useTag: true);
        Select(TransformerCombo, settings.TransformerProfile, useTag: true);
        Select(TransformationIntervalCombo, settings.TransformationIntervalSeconds.ToString(), useTag: true);
        Select(StartFormCombo, settings.StartForm, useTag: true);
        Select(ProfileCycleIntervalCombo, settings.ProfileCycleIntervalSeconds.ToString(), useTag: true);
        Select(RandomEventsCombo, settings.RandomEvents, useTag: true);
        UpdateProfileModeState();
    }

    private void SaveClick(object sender, RoutedEventArgs e)
    {
        _settingsService.Save(new AppSettings
        {
            ShowRealData = RealDataCheck.IsChecked == true,
            ShowGpuData = true,
            ShowNetworkData = true,
            EnableEvents = EventsCheck.IsChecked == true,
            MonitorTarget = Selected(MonitorCombo, true),
            TargetFps = int.TryParse(Selected(FpsCombo, false), out var fps) ? fps : 60,
            AnimationQuality = Selected(QualityCombo, false),
            ProfileMode = Selected(ProfileModeCombo, true),
            TransformerProfile = Selected(TransformerCombo, true),
            TransformationIntervalSeconds = int.TryParse(Selected(TransformationIntervalCombo, true), out var interval) ? interval : 15,
            StartForm = Selected(StartFormCombo, true),
            ProfileCycleIntervalSeconds = int.TryParse(Selected(ProfileCycleIntervalCombo, true), out var profileInterval) ? profileInterval : 60,
            RandomEvents = Selected(RandomEventsCombo, true)
        });
        if (Owner is not null) DialogResult = true;
        else Close();
    }

    private void CancelClick(object sender, RoutedEventArgs e)
    {
        if (Owner is not null) DialogResult = false;
        else Close();
    }

    private void ProfileModeChanged(object sender, SelectionChangedEventArgs e) => UpdateProfileModeState();

    private void UpdateProfileModeState()
    {
        if (ProfileCycleIntervalCombo is null || ProfileModeCombo is null) return;
        ProfileCycleIntervalCombo.IsEnabled = Selected(ProfileModeCombo, true) == "cycle";
    }

    private static void Select(System.Windows.Controls.ComboBox combo, string value, bool useTag)
    {
        foreach (var item in combo.Items.OfType<ComboBoxItem>())
        {
            var candidate = useTag ? item.Tag?.ToString() : item.Content?.ToString();
            if (!string.Equals(candidate, value, StringComparison.OrdinalIgnoreCase)) continue;
            combo.SelectedItem = item;
            return;
        }
        combo.SelectedIndex = 0;
    }

    private static string Selected(System.Windows.Controls.ComboBox combo, bool useTag)
    {
        var item = combo.SelectedItem as ComboBoxItem;
        return (useTag ? item?.Tag : item?.Content)?.ToString() ?? string.Empty;
    }
}
