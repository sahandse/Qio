<#
  Qio Windows bridge.

  A long-lived PowerShell 5.1 process that watches Windows and reports to the Qio
  main process over a loopback TCP socket:

    out : one JSON object per line, { "type": "..." } events
    in  : one JSON object per line, { "cmd": "..." } commands

  A socket is used instead of stdio on purpose: writing JSON to a redirected
  console from a spawned PowerShell is slow and buffered in ways that make the
  notch feel late. Sockets have real async reads and unbuffered writes.

  Everything uses API that ships with Windows (WinRT projection, Core Audio COM,
  kernel32/user32/dxva2) so Qio needs no native Node modules and no build tools.
  Set QIO_BRIDGE_DEBUG=1 to log loop timings.
#>

[CmdletBinding()]
param(
  [int]$Port = 0,
  [string]$Token = '',
  [int]$PollMs = 500,
  [switch]$Once
)

$ErrorActionPreference = 'Stop'
$script:Debug = [bool]$env:QIO_BRIDGE_DEBUG
$script:TotalClock = [System.Diagnostics.Stopwatch]::StartNew()

# ------------------------------------------------------------- event bus ------
$script:Writer = $null

function Send-Event {
  param([string]$Type, [hashtable]$Data)
  if (-not $script:Writer) { return }
  $payload = @{ type = $Type }
  if ($Data) { foreach ($key in $Data.Keys) { $payload[$key] = $Data[$key] } }
  try {
    $script:Writer.WriteLine(($payload | ConvertTo-Json -Compress -Depth 6))
  } catch { }
}

function Send-Timing {
  param([string]$Name, [long]$Milliseconds)
  if ($script:Debug) { Send-Event 'bridge-log' @{ level = 'info'; message = "timing $Name ${Milliseconds}ms" } }
}

# ------------------------------------------------------------ native helper ---
$script:NativeSource = @'
using System;
using System.Runtime.InteropServices;

public static class QioNative {
  // --- Core Audio: default render endpoint volume -------------------------
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  private class MMDeviceEnumeratorComObject { }

  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
  }

  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  }

  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out int count);
    int SetMasterVolumeLevel(float level, ref Guid ctx);
    int SetMasterVolumeLevelScalar(float level, ref Guid ctx);
    int GetMasterVolumeLevel(out float level);
    int GetMasterVolumeLevelScalar(out float level);
    int SetChannelVolumeLevel(uint channel, float level, ref Guid ctx);
    int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid ctx);
    int GetChannelVolumeLevel(uint channel, out float level);
    int GetChannelVolumeLevelScalar(uint channel, out float level);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }

  // Resolving the default endpoint costs ~15ms, so the interface is reused and
  // only re-resolved occasionally in case the default device changed.
  private static IAudioEndpointVolume cachedEndpoint = null;
  private static int cacheAge = 0;

  private static IAudioEndpointVolume Endpoint() {
    cacheAge++;
    if (cachedEndpoint != null && cacheAge < 20) return cachedEndpoint;
    cacheAge = 0;
    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
    var iid = typeof(IAudioEndpointVolume).GUID;
    object raw;
    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out raw));
    cachedEndpoint = (IAudioEndpointVolume)raw;
    return cachedEndpoint;
  }

  public static float GetVolume() {
    try { float level; Endpoint().GetMasterVolumeLevelScalar(out level); return level; }
    catch { return -1f; }
  }

  public static bool SetVolume(float level) {
    try { var ctx = Guid.Empty; return Endpoint().SetMasterVolumeLevelScalar(level, ref ctx) == 0; }
    catch { return false; }
  }

  public static bool GetMute() {
    try { bool mute; Endpoint().GetMute(out mute); return mute; }
    catch { return false; }
  }

  public static bool SetMute(bool mute) {
    try { var ctx = Guid.Empty; return Endpoint().SetMute(mute, ref ctx) == 0; }
    catch { return false; }
  }

  // --- Keyboard state ----------------------------------------------------
  [DllImport("user32.dll")] private static extern short GetKeyState(int key);
  public static bool CapsLock() { return (GetKeyState(0x14) & 1) != 0; }

  [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] private static extern IntPtr GetKeyboardLayout(uint threadId);

  public static string KeyboardLayout() {
    try {
      uint pid;
      uint thread = GetWindowThreadProcessId(GetForegroundWindow(), out pid);
      var hkl = GetKeyboardLayout(thread).ToInt64() & 0xFFFF;
      return ((int)hkl).ToString("X8");
    } catch { return ""; }
  }

  // --- Display brightness (internal panels, via dxva2) -------------------
  [StructLayout(LayoutKind.Sequential)]
  private struct RECT { public int Left, Top, Right, Bottom; }

  private delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data);

  [DllImport("user32.dll")]
  private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc callback, IntPtr data);

  [DllImport("dxva2.dll")]
  private static extern bool GetMonitorBrightness(IntPtr hMonitor, out uint min, out uint current, out uint max);

  [DllImport("dxva2.dll")]
  private static extern bool SetMonitorBrightness(IntPtr hMonitor, uint brightness);

  private static uint brightnessValue = 0;
  private static bool brightnessOk = false;
  private static bool brightnessSet = false;

  private static bool ReadBrightness(IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data) {
    uint min, current, max;
    if (GetMonitorBrightness(hMonitor, out min, out current, out max)) {
      brightnessValue = current;
      brightnessOk = true;
      return false;
    }
    return true;
  }

  public static int GetBrightness() {
    brightnessOk = false;
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, ReadBrightness, IntPtr.Zero);
    return brightnessOk ? (int)brightnessValue : -1;
  }

  private static bool WriteBrightness(IntPtr hMonitor, IntPtr hdc, ref RECT rect, IntPtr data) {
    if (SetMonitorBrightness(hMonitor, brightnessValue)) {
      brightnessSet = true;
      return false;
    }
    return true;
  }

  public static bool SetBrightness(int level) {
    brightnessValue = (uint)Math.Max(0, Math.Min(100, level));
    brightnessSet = false;
    EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, WriteBrightness, IntPtr.Zero);
    return brightnessSet;
  }

  // --- Power -------------------------------------------------------------
  [StructLayout(LayoutKind.Sequential)]
  private struct SYSTEM_POWER_STATUS {
    public byte ACLineStatus;
    public byte BatteryFlag;
    public byte BatteryLifePercent;
    public byte SystemStatusFlag;
    public int BatteryLifeTime;
    public int BatteryFullLifeTime;
  }

  [DllImport("kernel32.dll")]
  private static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS status);

  public static int BatteryPercent() {
    SYSTEM_POWER_STATUS status;
    if (!GetSystemPowerStatus(out status)) return -1;
    if (status.BatteryLifePercent == 255) return -1;
    return status.BatteryLifePercent;
  }

  public static bool OnAC() {
    SYSTEM_POWER_STATUS status;
    if (!GetSystemPowerStatus(out status)) return false;
    return status.ACLineStatus == 1;
  }
}
'@

# Compiled once and cached, so later launches skip the C# compiler entirely.
$cacheDirectory = Join-Path $env:LOCALAPPDATA 'Qio'
$sourceHash = [System.BitConverter]::ToString(
  [System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($script:NativeSource))
).Replace('-', '').Substring(0, 10)
$script:NativeDll = Join-Path $cacheDirectory "qio-native-$sourceHash.dll"

try {
  if (Test-Path $script:NativeDll) { Add-Type -Path $script:NativeDll | Out-Null }
} catch { }
if (-not ('QioNative' -as [type])) {
  try {
    New-Item -ItemType Directory -Force -Path $cacheDirectory | Out-Null
    Add-Type -TypeDefinition $script:NativeSource -OutputAssembly $script:NativeDll | Out-Null
    Add-Type -Path $script:NativeDll | Out-Null
  } catch {
    Add-Type -TypeDefinition $script:NativeSource | Out-Null
  }
}

Send-Timing 'compile' $script:TotalClock.ElapsedMilliseconds

$script:LastVolume = $null
$script:LastMuted = $null
$script:LastBrightness = $null
$script:LastCaps = $null
$script:LastLayout = $null
$script:LastBattery = $null
$script:LastCharging = $null

function Send-NativeSnapshot {
  param([switch]$IncludeSlow)

  $volume = [QioNative]::GetVolume()
  $muted = [QioNative]::GetMute()
  $caps = [QioNative]::CapsLock()
  $layout = [QioNative]::KeyboardLayout()
  $percent = if ($volume -lt 0) { $null } else { [math]::Round($volume * 100, 1) }

  if ($percent -ne $script:LastVolume -or $muted -ne $script:LastMuted) {
    Send-Event 'volume' @{ volume = $percent; muted = $muted }
    $script:LastVolume = $percent
    $script:LastMuted = $muted
  }
  if ($caps -ne $script:LastCaps) {
    Send-Event 'capslock' @{ capsLock = $caps }
    $script:LastCaps = $caps
  }
  if ($layout -and $layout -ne $script:LastLayout) {
    if ($script:LastLayout) { Send-Event 'layout' @{ layout = $layout } }
    $script:LastLayout = $layout
  }
  if (-not $IncludeSlow) { return }

  $brightness = [QioNative]::GetBrightness()
  if ($brightness -ge 0 -and $brightness -ne $script:LastBrightness) {
    Send-Event 'brightness' @{ brightness = $brightness }
    $script:LastBrightness = $brightness
  }
  $battery = [QioNative]::BatteryPercent()
  $charging = [QioNative]::OnAC()
  if ($battery -ge 0 -and ($battery -ne $script:LastBattery -or $charging -ne $script:LastCharging)) {
    Send-Event 'power' @{ battery = $battery; charging = $charging }
    $script:LastBattery = $battery
    $script:LastCharging = $charging
  }
}

# ------------------------------------------------------------------ socket ----
$client = New-Object System.Net.Sockets.TcpClient
$client.NoDelay = $true
try {
  $client.Connect('127.0.0.1', $Port)
} catch {
  exit 1
}
$stream = $client.GetStream()
$script:Writer = New-Object System.IO.StreamWriter($stream, (New-Object System.Text.UTF8Encoding($false)))
$script:Writer.AutoFlush = $true
$reader = New-Object System.IO.StreamReader($stream)

Send-Event 'hello' @{ token = $Token; pid = $PID }
Send-Timing 'socket' $script:TotalClock.ElapsedMilliseconds

# ------------------------------------------------------------- media engine --
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
      $_.Name -eq 'AsTask' -and
      $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]

  function Await($op, $resultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
    $netTask = $asTask.Invoke($null, @($op))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
  }

  $script:SmtcManagerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $script:HasMedia = $true
} catch {
  $script:HasMedia = $false
  Send-Event 'bridge-log' @{ level = 'warn'; message = "Media session unavailable: $($_.Exception.Message)" }
}

# Volume, caps lock, brightness and battery matter long before lyrics do, so the
# cheap snapshot goes out before the media session manager is used.
Send-NativeSnapshot -IncludeSlow

$script:Manager = $null
$script:ManagerAt = 0
$script:LastMedia = @{}
$script:LastArtKey = ''
$script:CachedArt = ''

function Get-Manager {
  $now = [Environment]::TickCount
  if ($script:Manager -and ($now - $script:ManagerAt) -lt 20000) { return $script:Manager }
  $script:Manager = Await ($script:SmtcManagerType::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $script:ManagerAt = $now
  return $script:Manager
}

function Get-MediaSnapshot {
  if (-not $script:HasMedia) { return $null }
  try {
    $manager = Get-Manager
    if (-not $manager) { return $null }
    $session = $manager.GetCurrentSession()
    if (-not $session) { return @{ status = 'stopped' } }

    $info = $session.GetPlaybackInfo()
    $status = 'stopped'
    if ($info -and $info.PlaybackStatus) {
      switch ([int]$info.PlaybackStatus) {
        4 { $status = 'playing' }
        5 { $status = 'paused' }
        default { $status = 'stopped' }
      }
    }

    $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $timeline = $session.GetTimelineProperties()

    $start = 0.0; $end = 0.0; $pos = 0.0
    if ($timeline) {
      $start = [double]$timeline.StartTime.TotalSeconds
      $end = [double]$timeline.EndTime.TotalSeconds
      $pos = [double]$timeline.Position.TotalSeconds - $start
    }
    if ($pos -lt 0) { $pos = 0 }

    $title = if ($props) { [string]$props.Title } else { '' }
    $artist = if ($props) { [string]$props.Artist } else { '' }
    $album = if ($props) { [string]$props.AlbumTitle } else { '' }

    # Album art is expensive, so it is only pulled when the track changes.
    $artKey = "$title|$artist|$album"
    if ($artKey -ne $script:LastArtKey) {
      $script:LastArtKey = $artKey
      $script:CachedArt = ''
      if ($props -and $props.Thumbnail) {
        try {
          $artStream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          $size = [uint32]$artStream.Size
          if ($size -gt 0 -and $size -lt 8000000) {
            $dataReader = [Windows.Storage.Streams.DataReader]::new($artStream.GetInputStreamAt(0))
            Await ($dataReader.LoadAsync($size)) ([uint32]) | Out-Null
            $bytes = New-Object byte[] $size
            $dataReader.ReadBytes($bytes)
            $mime = [string]$artStream.ContentType
            if (-not $mime) { $mime = 'image/png' }
            $script:CachedArt = "data:$mime;base64," + [Convert]::ToBase64String($bytes)
          }
          $artStream.Dispose()
        } catch { }
      }
    }

    return @{
      status      = $status
      title       = $title
      artist      = $artist
      album       = $album
      duration    = [math]::Round($end - $start, 3)
      position    = [math]::Round($pos, 3)
      app         = [string]$session.SourceAppUserModelId
      canNext     = if ($info) { [bool]$info.IsNextEnabled } else { $false }
      canPrevious = if ($info) { [bool]$info.IsPreviousEnabled } else { $false }
      canSeek     = if ($info -and $info.Controls) { $true } else { $false }
      artwork     = $script:CachedArt
    }
  } catch {
    return $null
  }
}

function Compare-Media($a, $b) {
  if ($null -eq $b -or $null -eq $a) { return $true }
  foreach ($key in 'status', 'title', 'artist', 'album', 'app', 'artwork') {
    if ($a[$key] -ne $b[$key]) { return $true }
  }
  if ([math]::Abs([double]$a.duration - [double]$b.duration) -gt 0.5) { return $true }
  if ([math]::Abs([double]$a.position - [double]$b.position) -gt 1.2) { return $true }
  return $false
}

function Invoke-MediaCommand($cmd) {
  $manager = Get-Manager
  if (-not $manager) { return }
  $session = $manager.GetCurrentSession()
  if (-not $session) { return }
  switch ($cmd.cmd) {
    'media-play' { $session.TryPlayAsync() | Out-Null }
    'media-pause' { $session.TryPauseAsync() | Out-Null }
    'media-playpause' { $session.TryTogglePlayPauseAsync() | Out-Null }
    'media-next' { $session.TrySkipNextAsync() | Out-Null }
    'media-previous' { $session.TrySkipPreviousAsync() | Out-Null }
    'media-stop' { $session.TryStopAsync() | Out-Null }
    'media-seek' {
      $seconds = [double]$cmd.position
      if ($seconds -lt 0) { $seconds = 0 }
      $session.TryChangePlaybackPositionAsync([long]($seconds * 10000000)) | Out-Null
    }
  }
}

# -------------------------------------------------------------------- loop -----
$readTask = $reader.ReadLineAsync()
$script:Tick = 0

Send-Event 'ready' @{ pid = $PID; startup = $script:TotalClock.ElapsedMilliseconds }
$script:LoopClock = [System.Diagnostics.Stopwatch]::StartNew()

$stop = $false
while (-not $stop) {
  # If Qio went away, the bridge goes with it instead of lingering.
  if ($client.Client.Poll(0, [System.Net.Sockets.SelectMode]::SelectRead) -and $client.Client.Available -eq 0) { break }
  $iteration = [System.Diagnostics.Stopwatch]::StartNew()
  Send-Timing 'tick-start' $script:LoopClock.ElapsedMilliseconds

  # --- commands --------------------------------------------------------------
  if ($readTask.IsCompleted) {
    $commandLine = $null
    try { $commandLine = $readTask.Result } catch { }
    if ($null -eq $commandLine) { break }
    $readTask = $reader.ReadLineAsync()
    if ($commandLine) {
      $cmd = $null
      try { $cmd = $commandLine | ConvertFrom-Json } catch { }
      if ($cmd -and $cmd.cmd) {
        try {
          switch -Regex ($cmd.cmd) {
            '^media-' { Invoke-MediaCommand $cmd }
            '^volume-nudge' {
              $step = if ($null -ne $cmd.step) { [double]$cmd.step } else { 0.05 }
              $current = [QioNative]::GetVolume()
              if ($current -lt 0) { $current = 0.5 }
              [QioNative]::SetVolume([float]([math]::Min(1, [math]::Max(0, $current + $step)))) | Out-Null
            }
            '^volume-set' { [QioNative]::SetVolume([float]([math]::Min(1, [math]::Max(0, [double]$cmd.level)))) | Out-Null }
            '^mute-set' { [QioNative]::SetMute([bool]$cmd.muted) | Out-Null }
            '^brightness-set' { [QioNative]::SetBrightness([int]$cmd.level) | Out-Null }
            '^ping' { Send-Event 'pong' @{ id = $cmd.id } }
            '^quit' { $stop = $true }
          }
        } catch {
          Send-Event 'bridge-log' @{ level = 'error'; message = "command $($cmd.cmd) failed: $($_.Exception.Message)" }
        }
      }
    }
  }

  # --- media -----------------------------------------------------------------
  $mediaClock = [System.Diagnostics.Stopwatch]::StartNew()
  $media = Get-MediaSnapshot
  if (Compare-Media $media $script:LastMedia) {
    if ($media) { Send-Event 'media' $media } else { Send-Event 'media' @{ status = 'unavailable' } }
    $script:LastMedia = $media
  }
  Send-Timing 'media' $mediaClock.ElapsedMilliseconds

  # --- volume, caps lock, layout every tick; brightness/battery every ~2s ----
  $nativeClock = [System.Diagnostics.Stopwatch]::StartNew()
  Send-NativeSnapshot -IncludeSlow:([bool]($script:Tick % 4 -eq 0))
  Send-Timing 'native' $nativeClock.ElapsedMilliseconds

  $script:Tick++
  Send-Timing 'iteration' $iteration.ElapsedMilliseconds
  if ($Once) { break }

  # Sleeping in slices means a click in the notch is handled within ~30ms while
  # the heavier media and native scans still run once per poll.
  $slept = 0
  while ($slept -lt $PollMs) {
    if ($readTask.IsCompleted) { break }
    Start-Sleep -Milliseconds 20
    $slept += 20
  }
}

Send-Event 'bye' @{}
try { $client.Close() } catch { }
