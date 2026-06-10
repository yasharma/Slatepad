#[cfg(target_os = "macos")]
mod detector;
#[cfg(target_os = "macos")]
mod mic;
#[cfg(target_os = "macos")]
mod recorder;
#[cfg(target_os = "macos")]
mod system_audio;

#[cfg(target_os = "macos")]
pub use detector::MeetingDetector;
#[cfg(target_os = "macos")]
pub use recorder::{AudioManager, RecordingResult};

#[cfg(target_os = "macos")]
use crate::audio::recorder::RecordingStatus;

use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RecordingStatusResponse {
    Idle,
    Detecting,
    Recording,
}

#[cfg(target_os = "macos")]
impl From<RecordingStatus> for RecordingStatusResponse {
    fn from(status: RecordingStatus) -> Self {
        match status {
            RecordingStatus::Idle => Self::Idle,
            RecordingStatus::Detecting => Self::Detecting,
            RecordingStatus::Recording => Self::Recording,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioPermissions {
    pub microphone: bool,
    pub system_audio: bool,
}

pub struct AudioState {
    #[cfg(target_os = "macos")]
    manager: Arc<Mutex<AudioManager>>,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            #[cfg(target_os = "macos")]
            manager: Arc::new(Mutex::new(AudioManager::new())),
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn start_meeting_detection(&self, _app: tauri::AppHandle) -> Result<(), String> {
        Err("Meeting detection is only supported on macOS.".into())
    }

    #[cfg(target_os = "macos")]
    pub fn start_meeting_detection(&self, app: tauri::AppHandle) -> Result<(), String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .start_meeting_detection(app)
    }

    #[cfg(not(target_os = "macos"))]
    pub fn stop_meeting_detection(&self) -> Result<(), String> {
        Ok(())
    }

    #[cfg(target_os = "macos")]
    pub fn stop_meeting_detection(&self) -> Result<(), String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .stop_meeting_detection()
    }

    #[cfg(not(target_os = "macos"))]
    pub fn start_recording(
        &self,
        _app: tauri::AppHandle,
        _pid: Option<u32>,
    ) -> Result<(), String> {
        Err("Recording is only supported on macOS.".into())
    }

    #[cfg(target_os = "macos")]
    pub fn start_recording(
        &self,
        app: tauri::AppHandle,
        pid: Option<u32>,
    ) -> Result<(), String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .start_recording(app, pid)
    }

    #[cfg(not(target_os = "macos"))]
    pub fn stop_recording(&self, _app: tauri::AppHandle) -> Result<RecordingResult, String> {
        Err("Recording is only supported on macOS.".into())
    }

    #[cfg(target_os = "macos")]
    pub fn stop_recording(&self, app: tauri::AppHandle) -> Result<RecordingResult, String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .stop_recording(app)
    }

    pub fn get_recording_status(&self) -> RecordingStatusResponse {
        #[cfg(target_os = "macos")]
        {
            self.manager
                .lock()
                .map(|manager| manager.get_recording_status().into())
                .unwrap_or(RecordingStatusResponse::Idle)
        }
        #[cfg(not(target_os = "macos"))]
        {
            RecordingStatusResponse::Idle
        }
    }

    pub fn check_audio_permissions(&self) -> AudioPermissions {
        #[cfg(target_os = "macos")]
        {
            self.manager
                .lock()
                .map(|manager| manager.check_audio_permissions())
                .unwrap_or(AudioPermissions {
                    microphone: false,
                    system_audio: false,
                })
        }
        #[cfg(not(target_os = "macos"))]
        {
            AudioPermissions {
                microphone: false,
                system_audio: false,
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn request_microphone_permission(&self, _app: tauri::AppHandle) -> Result<bool, String> {
        Ok(false)
    }

    #[cfg(target_os = "macos")]
    pub fn request_microphone_permission(&self, app: tauri::AppHandle) -> Result<bool, String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .request_microphone_permission(app)
    }

    #[cfg(not(target_os = "macos"))]
    pub fn request_system_audio_permission(&self, _app: tauri::AppHandle) -> Result<bool, String> {
        Ok(false)
    }

    #[cfg(target_os = "macos")]
    pub fn request_system_audio_permission(&self, app: tauri::AppHandle) -> Result<bool, String> {
        self.manager
            .lock()
            .map_err(|e| e.to_string())?
            .request_system_audio_permission(app)
    }
}

#[cfg(target_os = "macos")]
pub(crate) const TARGET_SAMPLE_RATE: u32 = 16_000;

#[cfg(target_os = "macos")]
pub(crate) fn recording_cache_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join("meeting-recordings"))
}

#[cfg(target_os = "macos")]
pub(crate) fn macos_version_at_least(major: u32, minor: u32, patch: u32) -> bool {
    let output = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .ok();
    let Some(output) = output else {
        return false;
    };
    let version = String::from_utf8_lossy(&output.stdout);
    let mut parts = version.trim().split('.');
    let parsed_major = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0);
    let parsed_minor = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0);
    let parsed_patch = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0);

    (parsed_major, parsed_minor, parsed_patch) >= (major, minor, patch)
}

#[cfg(target_os = "macos")]
pub(crate) fn system_audio_supported() -> bool {
    macos_version_at_least(14, 2, 0)
}

#[cfg(target_os = "macos")]
pub(crate) fn write_wav_f32(
    path: &std::path::Path,
    samples: &[f32],
    sample_rate: u32,
) -> Result<(), String> {
    use hound::{SampleFormat, WavSpec, WavWriter};

    if samples.is_empty() {
        return Err("No audio samples captured.".into());
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut writer = WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for &sample in samples {
        let amplitude = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        writer.write_sample(amplitude).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "macos")]
pub(crate) fn resample_mono(input: &[f32], input_rate: u32, output_rate: u32) -> Vec<f32> {
    if input.is_empty() || input_rate == 0 || output_rate == 0 {
        return Vec::new();
    }
    if input_rate == output_rate {
        return input.to_vec();
    }

    let ratio = input_rate as f64 / output_rate as f64;
    let output_len = ((input.len() as f64) / ratio).ceil() as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = i as f64 * ratio;
        let src_index = src_pos.floor() as usize;
        let frac = src_pos - src_index as f64;
        let a = input.get(src_index).copied().unwrap_or(0.0);
        let b = input.get(src_index + 1).copied().unwrap_or(a);
        output.push(a + (b - a) * frac as f32);
    }

    output
}

#[cfg(target_os = "macos")]
pub(crate) fn mix_to_mono_interleaved(samples: &[f32], channels: u16) -> Vec<f32> {
    let channels = channels.max(1) as usize;
    if channels == 1 {
        return samples.to_vec();
    }

    let frames = samples.len() / channels;
    let mut mono = Vec::with_capacity(frames);
    for frame in 0..frames {
        let start = frame * channels;
        let sum: f32 = samples[start..start + channels].iter().sum();
        mono.push(sum / channels as f32);
    }
    mono
}
