namespace F4rbfieberTransformersScreen.Models;

public sealed class AppSettings
{
    public bool ShowRealData { get; set; } = true;
    public bool ShowGpuData { get; set; } = true;
    public bool ShowNetworkData { get; set; } = true;
    public bool EnableEvents { get; set; } = true;
    public string MonitorTarget { get; set; } = "1";
    public int TargetFps { get; set; } = 60;
    public string AnimationQuality { get; set; } = "High";
    public int TransformationIntervalSeconds { get; set; } = 15;
    public string StartForm { get; set; } = "robot";
    public int ProfileCycleIntervalSeconds { get; set; } = 60;
    public string ProfileMode { get; set; } = "fixed";
    public string TransformerProfile { get; set; } = "optimus";
    public string RandomEvents { get; set; } = "normal";
}
