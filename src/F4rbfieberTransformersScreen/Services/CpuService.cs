using System.Runtime.InteropServices;
using LibreHardwareMonitor.Hardware;
using Microsoft.Win32;
using F4rbfieberTransformersScreen.Models;

namespace F4rbfieberTransformersScreen.Services;

public sealed class CpuService
{
    private readonly string _cpuName;
    private ulong _previousIdle;
    private ulong _previousKernel;
    private ulong _previousUser;

    public CpuService()
    {
        _cpuName = ReadCpuName();
        _ = ReadSystemTimes(out _previousIdle, out _previousKernel, out _previousUser);
    }

    public CpuTelemetry Read(IReadOnlyList<IHardware> hardware)
    {
        var cpuHardware = EnumerateHardware(hardware)
            .Where(h => h.HardwareType == HardwareType.Cpu)
            .ToArray();
        var primaryCpu = cpuHardware.FirstOrDefault();
        var sensors = primaryCpu?.Sensors ?? [];
        var totalFromSensor = sensors.FirstOrDefault(s =>
            s.SensorType == SensorType.Load && s.Name.Contains("Total", StringComparison.OrdinalIgnoreCase))?.Value;
        var cores = sensors
            .Where(s => s.SensorType == SensorType.Load && s.Name.Contains("Core", StringComparison.OrdinalIgnoreCase))
            .Select(s => Math.Round((double)(s.Value ?? 0), 1))
            .ToArray();
        var temperature = SelectCpuTemperature(cpuHardware);

        return new CpuTelemetry
        {
            Name = primaryCpu?.Name ?? _cpuName,
            Usage = Math.Round(totalFromSensor ?? ReadTotalUsage(), 1),
            Temperature = temperature,
            Cores = cores
        };
    }

    private static double? SelectCpuTemperature(IEnumerable<IHardware> cpuHardware)
    {
        var candidates = cpuHardware
            .SelectMany(h => h.Sensors)
            .Where(s => s.SensorType == SensorType.Temperature && IsValidTemperature(s.Value))
            .Select(s =>
            {
                var normalizedName = NormalizeSensorName(s.Name);
                return new TemperatureCandidate(
                    normalizedName,
                    s.Value!.Value,
                    GetOverallTemperaturePriority(normalizedName),
                    IsCoreTemperature(normalizedName));
            })
            .Where(candidate => !IsExcludedTemperature(candidate.NormalizedName))
            .ToArray();

        var overall = candidates
            .Where(candidate => candidate.OverallPriority > 0)
            .OrderByDescending(candidate => candidate.OverallPriority)
            .ThenByDescending(candidate => candidate.Value)
            .FirstOrDefault();
        if (overall.OverallPriority > 0)
            return Math.Round(overall.Value, 1);

        var coreTemperatures = candidates
            .Where(candidate => candidate.IsCore)
            .Select(candidate => candidate.Value)
            .ToArray();
        if (coreTemperatures.Length > 0)
            return Math.Round(coreTemperatures.Max(), 1);

        return candidates.Length > 0
            ? Math.Round(candidates.Max(candidate => candidate.Value), 1)
            : null;
    }

    private static int GetOverallTemperaturePriority(string name)
    {
        if (name.Contains("PACKAGE", StringComparison.Ordinal)) return 1000;
        if (name.Contains("TCTLTDIE", StringComparison.Ordinal) ||
            name.Contains("TDIETCTL", StringComparison.Ordinal)) return 950;
        if (name.Contains("TDIE", StringComparison.Ordinal)) return 925;
        if (name.Contains("TCTL", StringComparison.Ordinal)) return 900;
        if (name.Contains("COREMAX", StringComparison.Ordinal) ||
            name.Contains("MAXCORE", StringComparison.Ordinal)) return 875;
        if (name is "CPUCORE" or "CORE") return 850;
        if (name.Contains("CPUDIE", StringComparison.Ordinal)) return 825;
        if (name.Contains("CPUTEMPERATURE", StringComparison.Ordinal) ||
            name.Contains("CPUTEMP", StringComparison.Ordinal)) return 800;
        if (name is "CPU" or "PROCESSOR" or "DIE") return 800;
        if (name.Contains("CPUSOCKET", StringComparison.Ordinal)) return 750;
        return 0;
    }

    private static bool IsCoreTemperature(string name) =>
        name.Contains("CORE", StringComparison.Ordinal) ||
        name.Contains("CCD", StringComparison.Ordinal);

    private static bool IsExcludedTemperature(string name) =>
        name.Contains("DISTANCE", StringComparison.Ordinal) ||
        name.Contains("TJMAX", StringComparison.Ordinal) ||
        name.Contains("LIMIT", StringComparison.Ordinal) ||
        name.Contains("CRITICAL", StringComparison.Ordinal) ||
        name.Contains("TARGET", StringComparison.Ordinal) ||
        name.Contains("OFFSET", StringComparison.Ordinal) ||
        name.Contains("DELTA", StringComparison.Ordinal);

    private static bool IsValidTemperature(float? value) =>
        value.HasValue && float.IsFinite(value.Value) && value.Value is > 5f and < 130f;

    private static string NormalizeSensorName(string name) =>
        new(name.ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static IEnumerable<IHardware> EnumerateHardware(IEnumerable<IHardware> hardware)
    {
        foreach (var item in hardware)
        {
            yield return item;
            foreach (var child in EnumerateHardware(item.SubHardware))
                yield return child;
        }
    }

    private readonly record struct TemperatureCandidate(
        string NormalizedName,
        double Value,
        int OverallPriority,
        bool IsCore);

    private double ReadTotalUsage()
    {
        if (!ReadSystemTimes(out var idle, out var kernel, out var user)) return 0;
        var idleDelta = idle - _previousIdle;
        var kernelDelta = kernel - _previousKernel;
        var userDelta = user - _previousUser;
        _previousIdle = idle;
        _previousKernel = kernel;
        _previousUser = user;
        var total = kernelDelta + userDelta;
        return total == 0 ? 0 : Math.Clamp(100d * (total - idleDelta) / total, 0, 100);
    }

    private static string ReadCpuName()
    {
        try
        {
            return Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                ?.GetValue("ProcessorNameString")?.ToString()?.Trim() ?? "CPU";
        }
        catch { return "CPU"; }
    }

    private static bool ReadSystemTimes(out ulong idle, out ulong kernel, out ulong user)
    {
        if (GetSystemTimes(out var idleTime, out var kernelTime, out var userTime))
        {
            idle = idleTime.Value; kernel = kernelTime.Value; user = userTime.Value;
            return true;
        }
        idle = kernel = user = 0;
        return false;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(out FileTime idleTime, out FileTime kernelTime, out FileTime userTime);

    [StructLayout(LayoutKind.Sequential)]
    private readonly struct FileTime
    {
        private readonly uint Low;
        private readonly uint High;
        public ulong Value => ((ulong)High << 32) | Low;
    }
}
