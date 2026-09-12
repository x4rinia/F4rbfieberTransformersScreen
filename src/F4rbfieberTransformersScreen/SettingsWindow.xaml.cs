using System.Windows;
using System.Windows.Controls;
using F4rbfieberTransformersScreen.Models;
using F4rbfieberTransformersScreen.Services;

namespace F4rbfieberTransformersScreen;

public partial class SettingsWindow : Window
{
    private readonly SettingsService _settingsService;

    private System.Windows.Controls.CheckBox[] ProfileCycleChecks =>
        [GrimlockCycleCheck, HoundCycleCheck, OptimusCycleCheck, BumblebeeCycleCheck, MegatronCycleCheck, ShockwaveCycleCheck];

    public SettingsWindow(SettingsService settingsService)
    {
        _settingsService = settingsService;
        InitializeComponent();
        LoadSettings(settingsService.Load());
        PathText.Text = settingsService.SettingsPath;
    }

    private void LoadSettings(AppSettings settings)
    {
        CustomNameInput.Text = settings.CustomName;
        RealDataCheck.IsChecked = settings.ShowRealData;
        EventsCheck.IsChecked = settings.EnableEvents;
        Select(MonitorCombo, settings.MonitorTarget, useTag: true);
        Select(FpsCombo, settings.TargetFps.ToString(), useTag: false);
        Select(QualityCombo, settings.AnimationQuality, useTag: false);
        Select(ProfileModeCombo, settings.ProfileMode, useTag: true);
        Select(TransformerCombo, settings.TransformerProfile, useTag: true);
        Select(TransformationIntervalCombo, settings.TransformationIntervalSeconds.ToString(), useTag: true);
        RobotFormRadio.IsChecked = settings.StartForm != "alt";
        AltFormRadio.IsChecked = settings.StartForm == "alt";
        Select(ProfileCycleIntervalCombo, settings.ProfileCycleIntervalSeconds.ToString(), useTag: true);
        Select(RandomEventsCombo, settings.RandomEvents, useTag: true);
        EnergySavingCheck.IsChecked = settings.EnergySavingMode;
        var selectedProfiles = settings.SelectedTransformerProfiles.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var checkBox in ProfileCycleChecks)
            checkBox.IsChecked = selectedProfiles.Contains(checkBox.Tag?.ToString() ?? string.Empty);
        EnsureProfileSelection();
        UpdateProfileSelectionHint();
        UpdateProfileModeState();
        UpdateStartFormState();
    }

    private void SaveClick(object sender, RoutedEventArgs e)
    {
        _settingsService.Save(new AppSettings
        {
            CustomName = CustomNameInput.Text?.Trim() ?? string.Empty,
            ShowRealData = RealDataCheck.IsChecked == true,
            ShowGpuData = true,
            ShowNetworkData = true,
            EnableEvents = EventsCheck.IsChecked == true,
            MonitorTarget = Selected(MonitorCombo, true),
            TargetFps = int.TryParse(Selected(FpsCombo, false), out var fps) ? fps : 60,
            AnimationQuality = Selected(QualityCombo, false),
            ProfileMode = Selected(ProfileModeCombo, true),
            TransformerProfile = Selected(TransformerCombo, true),
            SelectedTransformerProfiles = SelectedCycleProfiles(),
            TransformationIntervalSeconds = int.TryParse(Selected(TransformationIntervalCombo, true), out var interval) ? interval : 15,
            StartForm = AltFormRadio.IsChecked == true ? "alt" : "robot",
            ProfileCycleIntervalSeconds = int.TryParse(Selected(ProfileCycleIntervalCombo, true), out var profileInterval) ? profileInterval : 60,
            RandomEvents = Selected(RandomEventsCombo, true),
            EnergySavingMode = EnergySavingCheck.IsChecked == true
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

    private void TransformationIntervalChanged(object sender, SelectionChangedEventArgs e) => UpdateStartFormState();

    private void ProfileSelectionChanged(object sender, RoutedEventArgs e)
    {
        if (SelectedCycleProfiles().Count > 0)
        {
            UpdateProfileSelectionHint();
            return;
        }

        if (sender is System.Windows.Controls.CheckBox checkBox) checkBox.IsChecked = true;
        ProfileSelectionHint.Text = "Mindestens ein Profil muss aktiv bleiben.";
    }

    private List<string> SelectedCycleProfiles() => ProfileCycleChecks
        .Where(checkBox => checkBox.IsChecked == true)
        .Select(checkBox => checkBox.Tag?.ToString() ?? string.Empty)
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .ToList();

    private void EnsureProfileSelection()
    {
        if (SelectedCycleProfiles().Count > 0) return;
        var currentProfile = Selected(TransformerCombo, true);
        var fallback = ProfileCycleChecks.FirstOrDefault(checkBox =>
            string.Equals(checkBox.Tag?.ToString(), currentProfile, StringComparison.OrdinalIgnoreCase))
            ?? OptimusCycleCheck;
        fallback.IsChecked = true;
    }

    private void UpdateProfileSelectionHint()
    {
        var count = SelectedCycleProfiles().Count;
        ProfileSelectionHint.Text = count == 1
            ? "1 Profil aktiv – kein unnötiger automatischer Wechsel."
            : $"{count} Profile für den automatischen Wechsel aktiv.";
    }

    private void UpdateProfileModeState()
    {
        if (ProfileCycleIntervalCombo is null || ProfileModeCombo is null || ProfileCycleSelectionPanel is null) return;
        var cycleEnabled = Selected(ProfileModeCombo, true) == "cycle";
        ProfileCycleIntervalCombo.IsEnabled = cycleEnabled;
        ProfileCycleSelectionPanel.IsEnabled = cycleEnabled;
        ProfileCycleSelectionPanel.Opacity = cycleEnabled ? 1 : 0.42;
    }

    private void UpdateStartFormState()
    {
        if (TransformationIntervalCombo is null || StartFormPanel is null) return;
        var fixedFormEnabled = Selected(TransformationIntervalCombo, true) == "0";
        StartFormPanel.IsEnabled = fixedFormEnabled;
        StartFormPanel.Opacity = fixedFormEnabled ? 1 : 0.42;
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
